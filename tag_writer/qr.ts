import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as config from '../config/config';

export function writeQrCode(triggercode: string) {
    console.log("writing trigger code to nfc tag");
    let qrData = {"action": "write", "data": triggercode};
    return fetch.default(config.NFC_TAG_API_URL,{ headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(qrData)});
}