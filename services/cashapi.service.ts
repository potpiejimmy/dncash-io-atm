
import * as fetch from 'node-fetch';
import * as config from '../config';
import * as util from '../util';


export function registerDevice(): Promise<any> {
    return invokeBackend(config.DN_API_URL+"devices", "POST", {
        refname: "Headless ATM"
    });
}

export function verifyCode(radiocode: string): Promise<any> {
    return invokeBackend(config.DN_API_URL+"tokens/"+radiocode+"?device_uuid="+config.DN_DEVICE_ID, "GET");
}

export function confirmToken(uid: string, updateData: any): Promise<any> {
    return invokeBackend(config.DN_API_URL+"tokens/"+uid+"?device_uuid="+config.DN_DEVICE_ID, "PUT", updateData);
}

export function createTrigger(expiresIn: number): Promise<any> {
    return invokeBackend(config.DN_API_URL+"trigger?device_uuid="+config.DN_DEVICE_ID+"&expiresIn=" + expiresIn, "POST", {});
}

export function requestTrigger(triggercode: string): Promise<any> {
    return invokeBackend(config.DN_API_URL+"trigger/"+triggercode, "POST", {});
}

function invokeBackend(url: string, method: string, body?: any) : Promise<any> {
    return fetch.default(url, {agent:util.getAgent(), headers: {"DN-API-KEY": config.DN_CASH_API_KEY,"DN-API-SECRET": config.DN_CASH_API_SECRET, "Content-Type": "application/json"}, method: method, body: JSON.stringify(body)}).then(res => res.json());
}
