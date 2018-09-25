import * as fetch from 'node-fetch';
import * as mqtt from 'mqtt';
import * as config from './config';
import * as cashApi from './services/cashapi.service';
import * as WebSocket from 'ws';
import * as util from './util';
import * as test from './test';

console.log("=== The ultimate banking machine API: " + new Date() + " ===\n");

if (!config.DN_CASH_API_KEY || !config.DN_CASH_API_SECRET) {
    console.log("Please set DN_CLEARING_API_KEY and DN_CLEARING_API_SECRET environment variables.");
    process.exit(1);
}

let ws = new WebSocket(config.CMD_V4_API_EVENT_URL);

if(config.IS_TEST_MODE)
    test.init();

ws.onopen = () => {
    console.log("CMD V4 WebSocket OPEN");
};

ws.onclose = m => {
    console.log("CMD V4 WebSocket CLOSE: " + m.reason);
};

function waitForDispenseEvent() : Promise<any> {
    return new Promise(function(resolve, reject) {
        ws.onmessage = m => {
            resolve(m.data);
        };

        ws.onerror = m => {
            reject("CMD V4 WebSocket ERR: " + m.message);
        };
    });
}

cashApi.createTrigger(99999999999).then(res => {
    console.log(JSON.stringify(res));
    let c = mqtt.connect(config.DN_MQTT_URL);
    c.on('connect', () => {
        console.log("MQTT connected");
        c.subscribe('dncash-io/trigger/' + res.triggercode);
    });
    c.on('message', (topic, message) => {
        console.log("Received token: " + message.toString() + "\n");
        let msg = JSON.parse(message.toString());
        dispenseMoney(msg.token).then(dispenseResponse => {
            if(!dispenseResponse) {
                //something went wrong, update token!
                cashApi.confirmToken(msg.token.uuid, createTokenResponse("FAILED",0)).then(token => console.log("failed token: " + JSON.stringify(token)));
            } else {
                //waiting for CMD V4 dispense Event response
                waitForDispenseEvent().then(message => {
                    let event = JSON.parse(message.toString());
                    if(event.eventType === "dispense") {
                        if(event.timeout && !event.notesTaken) {
                            sendRetract().then(() => {
                                cashApi.confirmToken(msg.token.uuid, createTokenResponse("RETRACTED",0)).then(token => console.log("retracted token: " + JSON.stringify(token)));
                            });
                        } else if(!event.timeout && event.notesTaken) {
                            getCassetteData().then(cassetteData => {
                                cashApi.confirmToken(msg.token.uuid, createTokenResponse("COMPLETED", calculateCashoutAmount(cassetteData, dispenseResponse))).then(token => console.log("confirmed token: " + JSON.stringify(token)));
                            });
                        }
                    }
                });
            }

            //IN TESTMODE SEND RESPONSE EVENT ON WEBSOCKET
            if(config.IS_TEST_MODE)
                test.sendTestResponse()
                
        }).catch(err => {
            console.log(err);
        });
    });
    c.on('error', err => {
        console.log("MQTT not ready: " + err);
    });
})

function dispenseMoney(token: any) : Promise<any> {
    //call CMDV4 API and get Cassette Info
    return getCassetteData().then(cassetteData => {
        if(cassetteData) {
            let denomResponse = util.findPerfectCashoutDenomination(cassetteData, token);

            if(denomResponse.foundDenom)
                //call CMDV4 API to dispense notes
                return dispense(denomResponse.cashoutRequest);
        }

        return Promise.resolve(false);
    });
}

function createTokenResponse(tokenState: string, amount: Number): any {
    return {
        amount: amount,
        state: tokenState,
        lockrefname: "CMD V4 API"
    }
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

function getCassetteData() : Promise<any> {
    //call CMDV4 API and get Cassette Info
    return fetch.default(config.CMD_V4_API_URL+"cassettes", { headers: {"Content-Type": "application/json"}, method: "GET"}).then(res => {
            if(res.ok) return util.parseCassetteData(res.json());
            else return Promise.resolve(false);
        });
}

function dispense(cashoutRequest: any) : Promise<any> {
    return fetch.default(config.CMD_V4_API_URL+"dispense", { headers: {"Content-Type": "application/json"}, method: "POST", body: JSON.stringify(cashoutRequest)}).then(res => {
                if(!res.ok) return Promise.resolve(false);
                else return res.json();
            });
}

function sendRetract() {
    console.log("sending retract...");
    return fetch.default(config.CMD_V4_API_URL+"dispense", { headers: {"Content-Type": "application/json"}, method: "POST", body: JSON.stringify({"retractWithTray": true})}).then(res => res.json());
}
