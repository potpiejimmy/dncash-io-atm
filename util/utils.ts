import * as fetch from 'node-fetch';
import * as FormData from 'form-data';
import * as WebSocket from 'ws';
import * as storage from 'node-persist';
import * as HttpsProxyAgent from 'https-proxy-agent';

import * as config from '../config/config';
import * as cashApi from '../services_dncash_io/cashapi.service';
import * as recovery from './recovery';
import * as responseHelper from './responsebuilder';
import * as test from '../test/test';

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

    if(cassetteData.failed)
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

export async function waitForWebsocketEvent(ws: any, eventType: string, repeat: boolean): Promise<any> {
    try {
        ws = new WebSocket(config.CMD_V4_API_EVENT_URL);
    } catch(err) {
        //CMD V4 API not available
        await recovery.restartCMDV4API();
        return waitForWebsocketEvent(ws, eventType, false);
    }
    return new Promise(function(resolve, reject) {
        ws.onopen = () => console.log("CMD V4 WebSocket OPEN");

        ws.onclose = m => {
            console.log("CMD V4 WebSocket CLOSED: " + m.reason);
            reject("timeout");
        }

        ws.onmessage = m => {
            if(JSON.parse(m.data.toString()).eventType === eventType)
                resolve(m.data);
        };

        ws.onerror = m => {
            reject("CMD V4 WebSocket ERROR: " + m.message);
        };

        //wait for two minutes -> of no event -> just continue!
        setTimeout(() => {if(ws)ws.terminate()}, 120000);

        if(config.IS_TEST_MODE && eventType === "dispense") {
            //IN TESTMODE SEND RESPONSE EVENT ON WEBSOCKET WITH 5s DELAY
            setTimeout(test.sendTestResponse, 5000);
        }
    });
}

export async function handleCMDV4Response(cmdV4ApiResponse: any) {
    if(!cmdV4ApiResponse)
        return responseHelper.buildApiErrorResponse("CMDV4 API not responding.", "FAILED");
    else if(!cmdV4ApiResponse.ok)
        return responseHelper.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    else {
        let jsonResponse = await cmdV4ApiResponse.json();
        console.log("CMDv4 response: " + JSON.stringify(jsonResponse) + "\n");
        return jsonResponse;
    }
}

export async function changeLED(status: string) {
    try {
        const form = new FormData();
        form.append('access_token', config.PARTICLE_ACCESS_TOKEN);
        form.append('arg', status);

        fetch.default(config.PARTICLE_URL, {method: "POST", body: form});
    } catch(err) {
        //nothing to do here if it cannot be reached.
    }
}
