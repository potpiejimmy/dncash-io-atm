import * as config from '../config/config';
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as WebSocket from 'ws';
import * as storage from 'node-persist';
import * as cashApi from '../services_dncash_io/cashapi.service';
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

export function waitForWebsocketEvent(ws: any, eventType: string): Promise<any> {
    ws = new WebSocket(config.CMD_V4_API_EVENT_URL);
    return new Promise(function(resolve, reject) {
        ws.onopen = () => console.log("CMD V4 WebSocket OPEN");

        ws.onclose = m => {
            console.log("CMD V4 WebSocket CLOSED: " + m.reason);
            resolve("timeout");
        }

        ws.onmessage = m => {
            if(JSON.parse(m.data.toString()).eventType === eventType)
                resolve(m.data);
        };

        ws.onerror = m => {
            reject("CMD V4 WebSocket ERROR: " + m.message);
        };

        setTimeout(() => {if(ws)ws.close()}, 120000);

        if(config.IS_TEST_MODE && eventType === "dispense") {
            //IN TESTMODE SEND RESPONSE EVENT ON WEBSOCKET WITH 5s DELAY
            setTimeout(test.sendTestResponse, 5000);
        }
    });
}