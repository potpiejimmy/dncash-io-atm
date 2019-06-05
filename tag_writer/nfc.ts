import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as config from '../config/config';
import * as i2ctag from '../util/i2ctag';

export async function writeNfcTag(triggercode: string): Promise<any> {
    //let nfcData = {"action": "write", "data": config.NFC_TAG_URL + triggercode};
    //console.log("nfc body: " + JSON.stringify(nfcData));
    //return fetch.default(config.NFC_TAG_API_URL,{ headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(nfcData)});

    await i2ctag.writeUriTag(config.NFC_TAG_URL + triggercode);
    console.log("New NFC tag data (read): " + i2ctag.readUriTag());
}
