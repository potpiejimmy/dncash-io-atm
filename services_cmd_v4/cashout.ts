import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as config from '../config/config';
import * as responseHelper from '../util/responsebuilder';
import * as cassettes from './cassettes';

export async function dispenseMoney(token: any): Promise<any> {
    //call CMDV4 API and get Cassette Info
    let cassetteData = await  cassettes.getCassetteData(false);

    if(cassetteData && !cassetteData.failed) {
        console.log("parsed cassette data: " + JSON.stringify(cassetteData) + "\n");
        let denomResponse = cassettes.findPerfectCashoutDenomination(cassetteData, token);
        console.log("calculated denomination: " + JSON.stringify(denomResponse) + "\n");

        if(denomResponse.foundDenom)
            //call CMDV4 API to dispense notes
            return dispense(denomResponse.cashoutDenom);
        else
            return responseHelper.buildApiErrorResponse("No suitable denomination found!", "REJECTED");
    } else
        return cassetteData;
}

export async function dispense(cashoutRequest: any): Promise<any> {
    console.log("sending CMDV4 dispense command with: " + JSON.stringify(cashoutRequest) + "\n");
    let cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"dispense",{ agent: util.getAgent(), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(cashoutRequest)});

    if(!cmdV4ApiResponse.ok)
        return responseHelper.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    else {
        let jsonResponse = await cmdV4ApiResponse.json();
        console.log("dispense CMDv4 response: " + JSON.stringify(jsonResponse) + "\n");
        return jsonResponse;
    }
}

export async function sendRetract(): Promise<any> {
    console.log("sending retract...\n");
    let cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"dispense", { agent: util.getAgent(), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify({"retractWithTray": true})});

    if(!cmdV4ApiResponse.ok)
        return responseHelper.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    else {
        let jsonResponse = await cmdV4ApiResponse.json();
        console.log("retract CMDv4 response: " + JSON.stringify(jsonResponse) + "\n");
        return jsonResponse;
    }
}