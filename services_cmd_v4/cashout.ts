import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as recovery from '../util/recovery';
import * as config from '../config/config';
import * as responseHelper from '../util/responsebuilder';
import * as cassettes from './cassettes';

export async function dispenseMoney(token: any): Promise<any> {
    //call CMDV4 API and get Cassette Info
    let cassetteData = await cassettes.getCassetteData(false, true);

    if(cassetteData && !cassetteData.failed) {
        console.log("parsed cassette data: " + JSON.stringify(cassetteData) + "\n");
        let denomResponse = cassettes.findPerfectCashoutDenomination(cassetteData, token);
        console.log("calculated denomination: " + JSON.stringify(denomResponse) + "\n");

        if(denomResponse.overAllNumberOfNotes > 20)
            return responseHelper.buildApiErrorResponse("You cannot withdraw more than 20 notes at a time!", util.TOKEN_STATES.REJECTED, {key:"noReset", value:true});
        if(denomResponse.foundDenom)
            //call CMDV4 API to dispense notes
            return dispense(denomResponse.cashoutDenom, true);
        else
            return responseHelper.buildApiErrorResponse("No suitable denomination found!", util.TOKEN_STATES.REJECTED, {key:"noReset", value:true});
    } else
        return cassetteData;
}

export async function dispense(cashoutRequest: any, repeatRequest: boolean): Promise<any> {
    console.log("sending CMDV4 dispense command with: " + JSON.stringify(cashoutRequest) + "\n");
    let cmdV4ApiResponse;
    //wait half a second to not stress the API
    await util.asyncPause(500);
    try {
        cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"dispense",{ agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(cashoutRequest)});
    } catch(err) {
        if(repeatRequest) {
            await recovery.restartCMDV4API();
            return dispense(cashoutRequest, false);
        }
    }
    
    return util.handleCMDV4Response(cmdV4ApiResponse);
}

export async function sendRetract(repeatRequest: boolean): Promise<any> {
    console.log("sending retract...\n");
    let cmdV4ApiResponse;
    try {
        cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"dispense", { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify({"retractWithTray": true})});
    } catch(err) {
        if(repeatRequest) {
            await recovery.restartCMDV4API();
            return sendRetract(false);
        }
    }

    return util.handleCMDV4Response(cmdV4ApiResponse);
}