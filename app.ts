import * as fetch from 'node-fetch';
import * as mqtt from 'mqtt';
import * as config from './config';
import * as cashApi from './services/cashapi.service';
import * as WebSocket from 'ws';
import * as util from './util';
import * as test from './test';

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
        console.log("MQTT connected")
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
        let res = await cashApi.createTrigger(99999999999)
        console.log(JSON.stringify(res)+"\n");
        if(config.USE_NFC_TAG) {
           writeNfcTag(res.triggercode);
        }
        
        subscribeForTrigger(res.triggercode);
    } catch(err) {
        console.log(err);
        process.exit(1);
    };
}

function subscribeForTrigger(trigger: string): Promise<any> {
    if(config.USE_MQTT) {
        c.unsubscribe("dncash-io/trigger/+", () => { c.subscribe('dncash-io/trigger/' + trigger)});
    } else {
        return fetch.default(config.DN_API_URL+"trigger/"+trigger, { agent: util.getAgent(), headers: {"DN-API-KEY": config.DN_CASH_API_KEY,"DN-API-SECRET": config.DN_CASH_API_SECRET, "Content-Type": "application/json"}, method: "GET"}).then(response => response.json()).then(token => {
            return handleToken(token);
        }).catch(() => createTrigger());
    }
}

function writeNfcTag(triggercode: string): Promise<any> {
    console.log("writing trigger code to nfc tag");
    let nfcData = {"action": "write", "data": triggercode};
    return fetch.default(config.NFC_TAG_API_URL,{ headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(nfcData)});
}

function handleMessage(topic, message) {
    console.log("Received token: " + message.toString() + "\n");
    let msg = JSON.parse(message.toString());
    handleToken(msg.token);
}

function handleToken(token: any): Promise<any> {
    return dispenseMoney(token).then(dispenseResponse => {
        if(!dispenseResponse) {
            return cashApi.confirmToken(token.uuid, createTokenUpdateResponse("FAILED",0,"Something went wrong while dispensing notes.")).then(token => console.log("failed token: " + JSON.stringify(token)+"\n"));
        }
        else if(dispenseResponse.failed) {
            //something went wrong, update token!
            return cashApi.confirmToken(token.uuid, createTokenUpdateResponse(dispenseResponse.type,0,dispenseResponse.message)).then(token => console.log("failed token: " + JSON.stringify(token)+"\n"));
        } else {
            console.log("dispense triggered ... waiting for dispense event\n");
            //waiting for CMD V4 dispense Event response
            return waitForDispenseEvent().then(message => {
                let event = JSON.parse(message.toString());
                if(ws) ws.close();
                if(event.eventType === "dispense") {
                    if(event.timeout && !event.notesTaken) {
                        return sendRetract().then(() => {
                            return cashApi.confirmToken(token.uuid, createTokenUpdateResponse("RETRACTED",0,"Notes were not taken. Retract was executed.")).then(token => console.log("retracted token: " + JSON.stringify(token)+"\n"));
                        });
                    } else if(!event.timeout && event.notesTaken) {
                        return getCassetteData(true).then(cassetteData => {
                            return cashApi.confirmToken(token.uuid, createTokenUpdateResponse("COMPLETED", calculateCashoutAmount(cassetteData, dispenseResponse), "Cashout was completed")).then(token => console.log("confirmed token: " + JSON.stringify(token)+"\n"));
                        });
                    }
                }
            });
        }                    
    }).catch(err => {
        if(ws) ws.close();
        console.log(err);
        return cashApi.confirmToken(token.uuid, createTokenUpdateResponse("FAILED",0,JSON.stringify(err))).then(token => console.log("failed token: " + JSON.stringify(token)+"\n"));
    }).then(() => {
        //we are finished -> close Websocket, unsubsribe from topic and open new MQTT with new trigger code
        if(ws) ws.close();
        createTrigger();
    });
}

function waitForDispenseEvent(): Promise<any> {
    ws = new WebSocket(config.CMD_V4_API_EVENT_URL);
    return new Promise(function(resolve, reject) {
        ws.onopen = () => console.log("CMD V4 WebSocket OPEN");

        ws.onclose = m => console.log("CMD V4 WebSocket CLOSE: " + m.reason);

        ws.onmessage = m => {
            if(JSON.parse(m.data.toString()).eventType === "dispense")
                resolve(m.data);
        };

        ws.onerror = m => {
            reject("CMD V4 WebSocket ERR: " + m.message);
        };

        if(config.IS_TEST_MODE) {
            //IN TESTMODE SEND RESPONSE EVENT ON WEBSOCKET WITH 5s DELAY
            setTimeout(test.sendTestResponse, 5000);
        }
    });
}

function dispenseMoney(token: any): Promise<any> {
    //call CMDV4 API and get Cassette Info
    return getCassetteData(false).then(cassetteData => {
        if(cassetteData && !cassetteData.failed) {
            console.log("parsed cassette data: " + JSON.stringify(cassetteData) + "\n");

            let denomResponse = util.findPerfectCashoutDenomination(cassetteData, token);

            console.log("calculated denomination: " + JSON.stringify(denomResponse) + "\n");

            if(denomResponse.foundDenom)
                //call CMDV4 API to dispense notes
                return dispense(denomResponse.cashoutDenom);
            else
                return Promise.resolve(buildApiErrorResponse("No suitable denomination found!", "REJECTED"));
        } else
            return Promise.resolve(buildApiErrorResponse("Error while getting cassette data!", "FAILED"));
    });
}

function getCassetteData(ignoreCassetteDefect: boolean): Promise<any> {
    console.log("getting cassette data\n");
    //call CMDV4 API and get Cassette Info
    return fetch.default(config.CMD_V4_API_URL+"cassettes", { headers: util.getJsonHeader(), method: "GET"}).then(cmdV4ApiResponse => {
        console.log("res cassette data\n");
        if(!cmdV4ApiResponse.ok)
            return Promise.resolve(buildErrorResponseFromCmdV4(cmdV4ApiResponse));
        else
            return cmdV4ApiResponse.json().then(cassetteData => {
                console.log("cassette data CMDV4 api response: " + JSON.stringify(cassetteData) + "\n");
                return Promise.resolve(util.parseCassetteData(cassetteData, ignoreCassetteDefect));
            });
    });
}

function dispense(cashoutRequest: any): Promise<any> {
    console.log("sending CMDV4 dispense command with: " + JSON.stringify(cashoutRequest) + "\n");
    return fetch.default(config.CMD_V4_API_URL+"dispense",{ headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(cashoutRequest)}).then(cmdV4ApiResponse => {
        if(!cmdV4ApiResponse.ok)
            return Promise.resolve(buildErrorResponseFromCmdV4(cmdV4ApiResponse));
        else {
            return cmdV4ApiResponse.json().then(response => {
                console.log("dispense CMDv4 response: " + JSON.stringify(response) + "\n");
                return Promise.resolve(response);
            });
        }
    });
}

function sendRetract(): Promise<any> {
    console.log("sending retract...\n");
    return fetch.default(config.CMD_V4_API_URL+"dispense", { headers: util.getJsonHeader(), method: "POST", body: JSON.stringify({"retractWithTray": true})}).then(cmdV4ApiResponse => {
        if(!cmdV4ApiResponse.ok)
            return Promise.resolve(buildErrorResponseFromCmdV4(cmdV4ApiResponse));
        else {
            return cmdV4ApiResponse.json().then(response => {
                console.log("retract CMDv4 response: " + JSON.stringify(response) + "\n");
                return Promise.resolve(response);
            });
        }
    });
}

function buildErrorResponseFromCmdV4(cmdV4ApiResponse: any) {
    if(cmdV4ApiResponse.status == 500) {
        return cmdV4ApiResponse.json().then(apiErrorResponse => {
            if(apiErrorResponse.errors && apiErrorResponse.errors.length > 0) {
                return buildApiErrorResponse(apiErrorResponse.errors[0].msg);
            } else
                return buildApiErrorResponse("Getting status " + cmdV4ApiResponse.status);
        });
    } else {
        return buildApiErrorResponse("Getting http status " + cmdV4ApiResponse.status);
    }
}

function buildApiErrorResponse(message?: string, type?: string): any {
    let errorResponse = {
        failed: true,
        type: type || "FAILED",
        message: message || "Something went wrong while trying to dispense money."
    }

    return errorResponse;
}

function calculateCashoutAmount(cassetteData: any, dispenseResponse: any): any {
    console.log("Cassette data for amount calc: " + JSON.stringify(cassetteData) + "\n");
    let cashoutAmount = 0;
    Object.keys(dispenseResponse).forEach(key => {
        if(key.endsWith("dispenseCount") && cassetteData[key.substring(0,1)]) {
            cashoutAmount += cassetteData[key.substring(0,1)].denomination * dispenseResponse[key];
        }
    });

    console.log("cashout amount: " + cashoutAmount + "\n");
    return cashoutAmount;
}

function createTokenUpdateResponse(tokenState: string, amount: Number, info: string): any {
    return {
        amount: amount,
        state: tokenState,
        lockrefname: "CMD V4 API",
        processing_info: info
    }
}