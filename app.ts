import * as fetch from 'node-fetch';
import * as mqtt from 'mqtt';
import * as WebSocket from 'ws';
import * as storage from 'node-persist';

import * as cashApi from './services_dncash_io/cashapi.service';
import * as cashout from './services_cmd_v4/cashout';
import * as cassettes from './services_cmd_v4/cassettes';

import * as config from './config/config';
import * as resHelper from './util/responsebuilder';
import * as util from './util/utils';
import * as test from './test/test';

import * as nfc from './tag_writer/nfc';

console.log("=== The ultimate banking machine API: " + new Date() + " ===\n");

let device_uuid: string;

let ws: WebSocket;
let c: mqtt.Client;

init();

async function init() {

    if(config.IS_TEST_MODE)
        test.init();

    if (!config.DN_CASH_API_KEY || !config.DN_CASH_API_SECRET) {
        console.log("Please set DN_CASH_API_KEY and DN_CASH_API_SECRET environment variables.\n");
        process.exit(1);
    }

    device_uuid = await util.initStorageAndDevice();

    if(config.USE_MQTT)
        initMQTT();
    else
        createTrigger();
}

async function reinit() {
    console.log("clearing storage...")
    await storage.clear();
    console.log("getting new device id");
    device_uuid = await util.initStorageAndDevice();
}

function initMQTT() {
    c = mqtt.connect(config.DN_MQTT_URL);
    c.on('connect', () => {
        console.log("MQTT connected. Creating trigger...")
        createTrigger();
    });

    c.on('message', (topic, message) => {
        handleMessage(topic, message);
    });

    c.on('close', () => {
        console.log("MQTT closed.");
    });

    c.on('error', err => {
        console.log("MQTT not ready: " + err);
        process.exit(1);
    });
}

async function createTrigger(): Promise<void> {
    try {
        let res = await cashApi.createTrigger(300, device_uuid)
        console.log(JSON.stringify(res)+"\n");
        if(res.error) {
            if(res.message && JSON.stringify(res.message).includes("device with UUID " + device_uuid + " not found.")) {
                await reinit();
                createTrigger();
            }
            return Promise.resolve();
        }

        if(config.WRITE_NFC_TAG) {
           nfc.writeNfcTag(res.triggercode);
        }
        
        listenForTrigger(res.triggercode);
    } catch(err) {
        console.log(err);
        process.exit(1);
    };
}

async function listenForTrigger(trigger: string): Promise<any> {
    if(config.USE_MQTT) {
        c.unsubscribe("dncash-io/trigger/+", () => { c.subscribe('dncash-io/trigger/' + trigger)});
    } else {
        return fetch.default(config.DN_API_URL+"trigger/"+trigger, { agent: util.getAgent(config.DN_API_URL), headers: {"DN-API-KEY": config.DN_CASH_API_KEY,"DN-API-SECRET": config.DN_CASH_API_SECRET, "Content-Type": "application/json"}, method: "GET"}).then(response => response.json()).then(token => {
            return handleToken(token);
        }).catch(() => createTrigger());
    }
}

function handleMessage(topic, message) {
    let msg = JSON.parse(message.toString());
    handleToken(msg.token);
}

async function handleToken(token: any): Promise<any> {
    console.log("Received token: " + JSON.stringify(token) + "\n");

    if(util.TOKEN_TYPES.CASHOUT === token.type)
        await processCashoutToken(token);
    else
        //await processCashinToken(token);
        await cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.REJECTED,token.amount, token.type + " tokens are not supported yet."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));

    //we are finished -> close Websocket, unsubsribe from topic and open new MQTT with new trigger code
    if(ws) ws.close();
    createTrigger();
}

async function processCashoutToken(token) {
    try {
        let dispenseResponse = await cashout.dispenseMoney(token);

        if(!dispenseResponse) {
            return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,token.amount,"Something went wrong while dispensing notes."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken,token));
        }
        else if(dispenseResponse.failed) {
            //something went wrong, update token!
            return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(dispenseResponse.type,token.amount,dispenseResponse), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));
        } else {
            console.log("dispense triggered ... waiting for dispense event\n");
            //waiting for CMD V4 dispense Event response
            let message = await waitForDispenseEvent();
            let event = JSON.parse(message.toString());
            if(ws) ws.close();
            if(event.eventType === "dispense") {
                if(event.timeout && !event.notesTaken) {
                    await cashout.sendRetract();
                    return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.RETRACTED,token.amount,"Notes were not taken. Retract was executed."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));
                } else if(!event.timeout && event.notesTaken) {
                    let cassetteData = await cassettes.getCassetteData(true);
                    return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.COMPLETED, util.calculateCashoutAmount(cassetteData, dispenseResponse), "Cashout was completed"), device_uuid).then(returnedToken => handleReturnedToken(returnedToken,token));
                }
            }
        }
    } catch(err) {
        console.log(err);
        return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,token.amount,err), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));
    }
}

function handleReturnedToken(confirmedToken: any, originalToken: any) {
    console.log("confirmed token: " + JSON.stringify(confirmedToken)+"\n")
    if(confirmedToken && confirmedToken.error) {
        return cashApi.confirmToken(originalToken.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,originalToken.amount,confirmedToken.message), device_uuid).then(returnedToken => console.log("error token: " + JSON.stringify(returnedToken)+"\n"));
    }
}

function waitForDispenseEvent(): Promise<any> {
    ws = new WebSocket(config.CMD_V4_API_EVENT_URL);
    return new Promise(function(resolve, reject) {
        ws.onopen = () => console.log("CMD V4 WebSocket OPEN");

        ws.onclose = m => console.log("CMD V4 WebSocket CLOSED: " + m.reason);

        ws.onmessage = m => {
            if(JSON.parse(m.data.toString()).eventType === "dispense")
                resolve(m.data);
        };

        ws.onerror = m => {
            reject("CMD V4 WebSocket ERROR: " + m.message);
        };

        if(config.IS_TEST_MODE) {
            //IN TESTMODE SEND RESPONSE EVENT ON WEBSOCKET WITH 5s DELAY
            setTimeout(test.sendTestResponse, 5000);
        }
    });
}
