import * as fetch from 'node-fetch';
import * as config from '../config/config';
import * as util from '../util/utils';


export function registerDevice(): Promise<any> {
    return invokeBackend(config.DN_API_URL+"devices", "POST", {
        type: "ATM",
        refname: "Headless ATM"
    });
}

export function verifyCode(radiocode: string, deviceuuid: string): Promise<any> {
    return invokeBackend(config.DN_API_URL+"tokens/"+radiocode+"?device_uuid="+deviceuuid, "GET");
}

export function confirmToken(uid: string, updateData: any, deviceuuid: string): Promise<any> {
    return invokeBackend(config.DN_API_URL+"tokens/"+uid+"?device_uuid="+deviceuuid, "PUT", updateData);
}

export function createTrigger(expiresIn: number, deviceuuid: string): Promise<any> {
    return invokeBackend(config.DN_API_URL+"trigger?device_uuid="+deviceuuid+"&expiresIn=" + expiresIn, "POST", {});
}

export function requestTrigger(triggercode: string): Promise<any> {
    return invokeBackend(config.DN_API_URL+"trigger/"+triggercode, "POST", {});
}

function invokeBackend(url: string, method: string, body?: any) : Promise<any> {
    return fetch.default(url, {agent:util.getAgent(url), headers: {"DN-API-KEY": config.DN_CASH_API_KEY,"DN-API-SECRET": config.DN_CASH_API_SECRET, "Content-Type": "application/json"}, method: method, body: JSON.stringify(body)}).then(res => res.json());
}
