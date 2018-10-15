import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as config from '../config/config';

export function writeNfcTag(triggercode: string): Promise<any> {
    let nfcData = {"action": "write", "data": triggercode};
    console.log("nfc body: " + JSON.stringify(nfcData));
    return fetch.default(config.NFC_TAG_API_URL,{ headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(nfcData)});
}