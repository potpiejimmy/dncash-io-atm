import * as config from '../config/config';
import * as HttpsProxyAgent from 'https-proxy-agent';

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

export function getAgent(): any {
    return config.USE_PROXY ? new HttpsProxyAgent(config.PROXY_URL): null;
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