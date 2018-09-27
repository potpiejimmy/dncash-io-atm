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
    console.log("Please set DN_CASH_API_KEY and DN_CASH_API_SECRET environment variables.");
    process.exit(1);
}

let ws = new WebSocket(config.CMD_V4_API_EVENT_URL);
ws.onopen = () => console.log("CMD V4 WebSocket OPEN");
ws.onclose = m => console.log("CMD V4 WebSocket CLOSE: " + m.reason);

let c: mqtt.Client;

initMQTT();

function initMQTT() {
    c = mqtt.connect(config.DN_MQTT_URL, {resubscribe: true});
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

function createTrigger() {
    cashApi.createTrigger(99999999999).then(res => {
        console.log(JSON.stringify(res));
        c.unsubscribe("dncash-io/trigger/+");
        c.subscribe('dncash-io/trigger/' + res.triggercode);        
    });
}

function handleMessage(topic, message) {
    console.log("Received token: " + message.toString() + "\n");
    let msg = JSON.parse(message.toString());
    return dispenseMoney(msg.token).then(dispenseResponse => {
        if(!dispenseResponse) {
            return cashApi.confirmToken(msg.token.uuid, createTokenUpdateResponse("FAILED",0,"Something went wrong while dispensing notes.")).then(token => console.log("failed token: " + JSON.stringify(token)));
        }
        else if(dispenseResponse.failed) {
            //something went wrong, update token!
            return cashApi.confirmToken(msg.token.uuid, createTokenUpdateResponse(dispenseResponse.type,0,dispenseResponse.message)).then(token => console.log("failed token: " + JSON.stringify(token)));
        } else {
            //waiting for CMD V4 dispense Event response
            return waitForDispenseEvent().then(message => {
                let event = JSON.parse(message.toString());
                if(event.eventType === "dispense") {
                    if(event.timeout && !event.notesTaken) {
                        return sendRetract().then(() => {
                            return cashApi.confirmToken(msg.token.uuid, createTokenUpdateResponse("RETRACTED",0,"Notes were not taken. Retract was executed.")).then(token => console.log("retracted token: " + JSON.stringify(token)));
                        });
                    } else if(!event.timeout && event.notesTaken) {
                        return getCassetteData().then(cassetteData => {
                            return cashApi.confirmToken(msg.token.uuid, createTokenUpdateResponse("COMPLETED", calculateCashoutAmount(cassetteData, dispenseResponse), "Cashout was completed")).then(token => console.log("confirmed token: " + JSON.stringify(token)));
                        });
                    }
                }
            });
        }                    
    }).catch(err => {
        console.log(err);
        return cashApi.confirmToken(msg.token.uuid, createTokenUpdateResponse("FAILED",0,JSON.stringify(err))).then(token => console.log("failed token: " + JSON.stringify(token)));
    }).then(() => {
        //we are finished -> open new MQTT with new trigger code
        c.unsubscribe(topic);
        createTrigger();
    });
}

function waitForDispenseEvent(): Promise<any> {
    return new Promise(function(resolve, reject) {
        ws.onmessage = m => {
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
    return getCassetteData().then(cassetteData => {
        if(cassetteData && !cassetteData.failed) {
            let denomResponse = util.findPerfectCashoutDenomination(cassetteData, token);

            if(denomResponse.foundDenom)
                //call CMDV4 API to dispense notes
                return dispense(denomResponse.cashoutRequest);
            else
                return Promise.resolve(buildApiErrorResponse("No suitable denomination found!", "REJECTED"));
        } else return Promise.resolve(buildApiErrorResponse("Error while getting cassette data!", "FAILED"));
    });
}

function getCassetteData(): Promise<any> {
    //call CMDV4 API and get Cassette Info
    return fetch.default(config.CMD_V4_API_URL+"cassettes", {headers: {"Content-Type": "application/json"}, method: "GET"}).then(cmdV4ApiResponse => {
        if(!cmdV4ApiResponse.ok) {
            return Promise.resolve(buildErrorResponseFromCmdV4(cmdV4ApiResponse));
        } 
        else {
            return cmdV4ApiResponse.json().then(cassetteData => Promise.resolve(util.parseCassetteData(cassetteData)));
        }
    });
}

function dispense(cashoutRequest: any): Promise<any> {
    return fetch.default(config.CMD_V4_API_URL+"dispense500",{ headers: {"Content-Type": "application/json"}, method: "POST", body: JSON.stringify(cashoutRequest)}).then(cmdV4ApiResponse => {
        if(!cmdV4ApiResponse.ok) return Promise.resolve(buildErrorResponseFromCmdV4(cmdV4ApiResponse));
        else return cmdV4ApiResponse.json();
    });
}

function sendRetract(): Promise<any> {
    console.log("sending retract...");
    return fetch.default(config.CMD_V4_API_URL+"dispense", { headers: {"Content-Type": "application/json"}, method: "POST", body: JSON.stringify({"retractWithTray": true})}).then(cmdV4ApiResponse => {
        if(!cmdV4ApiResponse.ok) return Promise.resolve(buildErrorResponseFromCmdV4(cmdV4ApiResponse));
        else return cmdV4ApiResponse.json();
    });
}

function buildErrorResponseFromCmdV4(cmdV4ApiResponse: any) {
    if(cmdV4ApiResponse.status == 500) {
        return cmdV4ApiResponse.json().then(apiErrorResponse => {
            if(apiErrorResponse.errors && apiErrorResponse.errors.length > 0) {
                return buildApiErrorResponse(apiErrorResponse.errors[0].msg);
            } else
                return buildApiErrorResponse();
        });
    } else {
        return buildApiErrorResponse();
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
    let cashoutAmount = 0;
    for(var key in cassetteData) {
        let cassette = cassetteData[key];
        for(var dispenseKey in dispenseResponse) {
            if(dispenseKey.endsWith("dispenseCount")) {
                if(dispenseKey.substring(0,1) === key) {
                    cashoutAmount += cassette.denomination * dispenseResponse[dispenseKey];
                    delete dispenseResponse[dispenseKey];
                }
            }
        }
    }

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
