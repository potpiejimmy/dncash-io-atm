import * as config from '../config/config';
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as storage from 'node-persist';
import * as cashApi from '../services_dncash_io/cashapi.service';

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
        if(key.endsWith("dispenseCount") && cassetteData[key.substring(0,1)]) {
            cashoutAmount += cassetteData[key.substring(0,1)].denomination * dispenseResponse[key];
        }
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