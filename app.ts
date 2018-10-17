import * as fetch from 'node-fetch';
import * as mqtt from 'mqtt';
import * as WebSocket from 'ws';

import * as cashApi from './services_dncash_io/cashapi.service';
import * as cashout from './services_cmd_v4/cashout';
import * as cassettes from './services_cmd_v4/cassettes';

import * as config from './config/config';
import * as resHelper from './util/responsebuilder';
import * as util from './util/utils';
import * as test from './test/test';

import * as nfc from './tag_writer/nfc';

console.log("=== The ultimate banking machine API: " + new Date() + " ===\n");

if(config.IS_TEST_MODE)
    test.init();

if (!config.DN_CASH_API_KEY || !config.DN_CASH_API_SECRET) {
    console.log("Please set DN_CASH_API_KEY and DN_CASH_API_SECRET environment variables.\n");
    process.exit(1);
}

let ws: WebSocket;
let c: mqtt.Client;

if(config.USE_MQTT)
    initMQTT();
else
    createTrigger();

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
        let res = await cashApi.createTrigger(300)
        console.log(JSON.stringify(res)+"\n");
        if(res.error)
            process.exit(1);

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
        await cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.REJECTED,0, token.type + " tokens are not supported yet.")).then(token => console.log("rejected token: " + JSON.stringify(token)+"\n"));

    //we are finished -> close Websocket, unsubsribe from topic and open new MQTT with new trigger code
    if(ws) ws.close();
    createTrigger();
}

async function processCashoutToken(token) {
    try {
        let dispenseResponse = await cashout.dispenseMoney(token);

        if(!dispenseResponse) {
            return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,0,"Something went wrong while dispensing notes.")).then(token => console.log("failed token: " + JSON.stringify(token)+"\n"));
        }
        else if(dispenseResponse.failed) {
            //something went wrong, update token!
            return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(dispenseResponse.type,0,dispenseResponse)).then(token => console.log("failed token: " + JSON.stringify(token)+"\n"));
        } else {
            console.log("dispense triggered ... waiting for dispense event\n");
            //waiting for CMD V4 dispense Event response
            let message = await waitForDispenseEvent();
            let event = JSON.parse(message.toString());
            if(ws) ws.close();
            if(event.eventType === "dispense") {
                if(event.timeout && !event.notesTaken) {
                    await cashout.sendRetract();
                    return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.RETRACTED,0,"Notes were not taken. Retract was executed.")).then(token => console.log("retracted token: " + JSON.stringify(token)+"\n"));
                } else if(!event.timeout && event.notesTaken) {
                    let cassetteData = await cassettes.getCassetteData(true);
                    return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.COMPLETED, util.calculateCashoutAmount(cassetteData, dispenseResponse), "Cashout was completed")).then(token => console.log("confirmed token: " + JSON.stringify(token)+"\n"));
                }
            }
        }
    } catch(err) {
        console.log(err);
        return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,0,err)).then(token => console.log("failed token: " + JSON.stringify(token)+"\n"));
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
