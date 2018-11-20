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
import * as recovery from './util/recovery';
import * as test from './test/test';

import * as nfc from './tag_writer/nfc';

console.log("=== The ultimate banking machine API: " + new Date() + " ===\n");

let device_uuid: string;
let canProcessToken = false;

let ws: WebSocket;
let mqttClient: mqtt.Client;

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
        createTrigger(true);
}

async function reinit() {
    console.log("clearing storage...")
    await storage.clear();
    console.log("getting new device id");
    device_uuid = await util.initStorageAndDevice();
}

function initMQTT() {
    mqttClient = mqtt.connect(config.DN_MQTT_URL, {username: config.DN_MQTT_USER, password: config.DN_MQTT_PASSWORD});
    mqttClient.on('connect', () => {
        console.log("MQTT connected. Creating trigger...")
        createTrigger(true);
    });

    mqttClient.on('message', (topic, message) => {
        handleMessage(topic, message);
    });

    mqttClient.on('close', () => {
        console.log("MQTT closed.");
    });

    mqttClient.on('error', err => {
        console.log("MQTT not ready: " + err);
        process.exit(1);
    });
}

async function createTrigger(repeat: boolean): Promise<void> {
    try {
        let res;
        try {
            res = await cashApi.createTrigger(300, device_uuid)
        } catch(err) {
            if(repeat)
                return util.asyncPause(5000).then(() => createTrigger(false));
            else {
                util.changeLED('off');
                console.log('trigger could not be created. Please check!');
                process.exit(1);
            }
        }

        console.log(JSON.stringify(res)+"\n");
        if(res.error) {
            if(res.message && JSON.stringify(res.message).includes("device with UUID " + device_uuid + " not found.")) {
                await reinit();
                createTrigger(true);
            }
            return Promise.resolve();
        }

        if(config.WRITE_NFC_TAG) {
           nfc.writeNfcTag(res.triggercode);
        }
        
        listenForTrigger(res.triggercode);
    } catch(err) {
        util.changeLED('off');
        console.log(err);
        process.exit(1);
    };
}

async function listenForTrigger(trigger: string): Promise<any> {
    canProcessToken = true;
    console.log("Can process token? " + canProcessToken);

    if(config.USE_MQTT) {
        mqttClient.subscribe('dncash-io/trigger/' + trigger, () => { console.log("MQTT subscribed for trigger: " + trigger)});    
        util.changeLED('on');
    } else {
        fetch.default(config.DN_API_URL+"trigger/"+trigger, { agent: util.getAgent(config.DN_API_URL), headers: {"DN-API-KEY": config.DN_CASH_API_KEY,"DN-API-SECRET": config.DN_CASH_API_SECRET, "Content-Type": "application/json"}, method: "GET"}).then(response => response.json()).then(token => {
            return handleToken(token);
        }).catch(() => createTrigger(true));

        util.changeLED('on');
    }
}

function handleMessage(topic, message) {
    let msg = JSON.parse(message.toString());
    handleToken(msg.token);
}

async function handleToken(token: any): Promise<any> {
    console.log("Received token: " + JSON.stringify(token) + "\n");
    console.log("can proccess token? : " + canProcessToken);
    if(!canProcessToken)
        cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.REJECTED,token.amount,"Device is not ready yet."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));
    else
        canProcessToken = false;

    //unsubscribe for this trigger to not listen for more tokens!
    if(config.USE_MQTT && !config.USE_STATIC_TRIGGER) {
        mqttClient.unsubscribe("dncash-io/trigger/+", () => { console.log("MQTT unsubscribed.")});
    }

    if(util.TOKEN_TYPES.CASHOUT === token.type)
        await processCashoutToken(token);
    else
        //await processCashinToken(token);
        await cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.REJECTED,token.amount, "This device does not support " + token.type + " tokens."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));

    // we are finished -> create new trigger
    createTrigger(true);
}

async function processCashoutToken(token) {
    try {
        util.changeLED('off');
        let dispenseResponse = await cashout.dispenseMoney(token);

        if(!dispenseResponse) {
            await cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,token.amount,"Something went wrong while dispensing notes."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken,token));
            return recovery.sendReset(true);
        }
        else if(dispenseResponse.failed) {
            //something went wrong, update token!
            await cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(dispenseResponse.type,token.amount,dispenseResponse), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));
            // -> WENN NO SUITABLE DENOM FOUND -> KEIN RESET!!!
            if(!dispenseResponse.noReset)
                return recovery.sendReset(true);
        } else {
            console.log("dispense triggered ... waiting for dispense event\n");
            util.changeLED('blink');
            //waiting for CMD V4 dispense Event response
            let message;
            try {
                message = await util.waitForWebsocketEvent(ws,"dispense", 30000, true);
            } catch(err) {
                console.log("No WebSocket event was triggered.")
                //do not update token -> keep it in locked 
                //return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.FAILED,token.amount,"No WebSocket event was triggered."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken,token));
            }
            if(message) {
                console.log("WebSocket message: " + JSON.stringify(message.toString()));
                let event = JSON.parse(message.toString());
                if(event.eventType === "dispense") {
                    util.changeLED('off');
                    if(event.timeout && !event.notesTaken) {
                        await cashout.sendRetract(true);
                        return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.RETRACTED,token.amount,"Notes were not taken. Retract was executed."), device_uuid).then(returnedToken => handleReturnedToken(returnedToken, token));
                    } else if(!event.timeout && event.notesTaken) {
                        let cassetteData = await cassettes.getCassetteData(true, true);
                        return cashApi.confirmToken(token.uuid, resHelper.createTokenUpdateResponse(util.TOKEN_STATES.COMPLETED, util.calculateCashoutAmount(cassetteData, dispenseResponse), "Cashout was completed"), device_uuid).then(returnedToken => handleReturnedToken(returnedToken,token));
                    }
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
