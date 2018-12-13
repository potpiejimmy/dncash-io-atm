import * as WebSocket from 'ws';
import * as storage from 'node-persist';
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as onoff from 'onoff';

let LED = new onoff.Gpio(21, 'out');
let blinkInterval: NodeJS.Timeout;

import * as config from '../config/config';
import * as cashApi from '../services_dncash_io/cashapi.service';
import * as recovery from './recovery';
import * as responseHelper from './responsebuilder';
import * as test from '../test/test'

export enum TOKEN_TYPES {
    CASHOUT = "CASHOUT",
    CASHIN = "CASHIN",
}

export enum TOKEN_STATES {
    FAILED = "FAILED",
    CANCELED = "CANCELED",
    REJECTED = "REJECTED",
    RETRACTED = "RETRACTED",
    COMPLETED ="COMPLETED"
}

export function getAgent(url: string): any {
    return (config.USE_PROXY && !url.includes("localhost") && !url.includes("127.0.0.1")) ? new HttpsProxyAgent(config.PROXY_URL): null;
}

export function getJsonHeader(): any {
    return {"Content-Type": "application/json"};
}

export function calculateCashoutAmount(cassetteData: any, dispenseResponse: any): any {
    console.log("Cassette data for amount calc: " + JSON.stringify(cassetteData) + "\n");

    if(!cassetteData || cassetteData.failed)
        //fallback for symbioticon -> use the cassette values we know of to not crash!
        cassetteData = [{"id":"1", "denomination":500},{"id":"2", "denomination":1000},{"id":"3", "denomination":2000},{"id":"4", "denomination":5000}]
    
    let cashoutAmount = 0;
    Object.keys(dispenseResponse).forEach(key => {
        cassetteData.forEach(cassette => {
            if(key.endsWith("dispenseCount") && cassette.id === key.substring(0,1)) {
                cashoutAmount += cassette.denomination * dispenseResponse[key];
            }
        });
    });

    console.log("cashout amount: " + cashoutAmount + "\n");
    return cashoutAmount;
}

export async function initStorageAndDevice(): Promise<string> {
    let device_uuid;
    console.log("init storage");
    await storage.init({dir:"storage"});
    console.log("storage initialized");
    if(!(device_uuid = await storage.getItem("device-uuid"))) {
        console.log("register new device...")
        device_uuid = (await cashApi.registerDevice()).uuid;
        
        if(device_uuid)
            await storage.setItem("device-uuid", device_uuid);
    }

    console.log("device uuid: " + device_uuid);
    return device_uuid;
}

export async function waitForWebsocketEvent(ws: any, eventType: string, timeout: number, canCancel?: boolean): Promise<any> {
    let alreadyProcessed = false;
    try {
        ws = new WebSocket(config.CMD_V4_API_EVENT_URL);
    } catch(err) {
        //CMD V4 API not available
        if(!canCancel) {
            await recovery.restartCMDV4API();
            return waitForWebsocketEvent(ws, eventType, timeout, true);
        } else {
            return Promise.reject("CMDV4 API not responding");
        }
    }
    return new Promise(function(resolve, reject) {
        ws.onopen = () => console.log("CMD V4 WebSocket OPEN");

        ws.onclose = m => {
            alreadyProcessed = true;
            console.log("CMD V4 WebSocket CLOSED: " + m.reason);
            reject("timeout");
        }

        ws.onmessage = m => {
            if(JSON.parse(m.data.toString()).eventType === eventType) {
                alreadyProcessed = true;
                ws.terminate();
                resolve(m.data);
            }
        };

        ws.onerror = m => {
            alreadyProcessed = true;
            ws.terminate();
            reject("CMD V4 WebSocket ERROR: " + m.message);
        };

        //wait for one minute -> if no event -> just continue!
        setTimeout(() => {if (ws && !alreadyProcessed) ws.terminate()}, timeout);

        if(config.IS_TEST_MODE && eventType === "dispense") {
            //IN TESTMODE SEND RESPONSE EVENT ON WEBSOCKET WITH 5s DELAY
            setTimeout(test.sendTestResponse, 5000);
        }
    });
}

export async function handleCMDV4Response(cmdV4ApiResponse: any) {
    if(!cmdV4ApiResponse || !cmdV4ApiResponse.ok)
        return responseHelper.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    else {
        let jsonResponse = await cmdV4ApiResponse.json();
        console.log("CMDv4 response: " + JSON.stringify(jsonResponse) + "\n");
        return jsonResponse;
    }
}

export async function changeLED(status: string) {
    try {
        console.log("LED status: " + status);
        if("blink"===status) {
            console.log("let LED blink!");
            blinkInterval = setInterval(() => {LED.writeSync(LED.readSync()^1);},500);
        } else {
            if(blinkInterval) {
                console.log("stop LED blinking!");
                clearInterval(blinkInterval);
                blinkInterval = null;
            }

            if('on'===status)
                LED.writeSync(1);
            else if('off'===status)
                LED.writeSync(0);
        }
    } catch(err) {
        console.log(JSON.stringify(err));
    }
}

export async function asyncPause(miliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, miliseconds));
}
