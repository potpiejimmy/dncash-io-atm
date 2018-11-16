import * as fetch from 'node-fetch';
import * as process  from 'child_process';
import * as WebSocket from 'ws';
import * as util from '../util/utils';
import * as config from '../config/config';
import * as responseHelper from '../util/responsebuilder';

let ws: WebSocket;

export async function sendReset(repeatRequest: boolean): Promise<any> {
    console.log("sending reset...\n");
    let cmdV4ApiResponse;
    try {
        cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"device", { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify({"reset": true})});
    } catch(err) {
        if(repeatRequest) {
            await restartCMDV4API();
            return sendReset(false);
        }
    }

    if(cmdV4ApiResponse && cmdV4ApiResponse.ok) {
        console.log("waiting for 'resetDone' event...");
        let message = await util.waitForWebsocketEvent(ws, "resetDone", true);
        let event = JSON.parse(message.toString());
        if(ws) ws.close();
        if(event.eventType === "resetDone") {
            return initCassettes();
        } else if(event === "timeout") {
            return responseHelper.buildApiErrorResponse("No WebSocket event was triggered", "FAILED")
        }
    } else {
        return responseHelper.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    }
}

export async function initCassettes() {
    console.log("sending init cassettes...\n");
    await initSingleCassette("1", true);
    await initSingleCassette("2", true);
    await initSingleCassette("3", true);
    await initSingleCassette("4", true);
    console.log("init cassettes done.");
}

async function initSingleCassette(cassetteId: string, repeatRequest: boolean) {
    let updateInfo = {
        "updateWithCassetteCheck": true,
        "totalCount": 1000,
        "ndvCount": 1000
    }

    let confirmInfo = {
        "confirmCountWithError": true
    }

    let cmdV4ApiResponse;
    try {
        cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"cassettes/"+cassetteId, { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(updateInfo)});
    } catch(err) {
        if(repeatRequest) {
            await restartCMDV4API();
            return initSingleCassette(cassetteId,false);
        }
    }

    if(cmdV4ApiResponse && cmdV4ApiResponse.ok) {
        try {
            cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"cassettes/"+cassetteId, { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(confirmInfo)});
        } catch(err) {
            //Nothing to do -> cassette cannot be initialized!
        }
    }

    if(cmdV4ApiResponse && cmdV4ApiResponse.ok)
        console.log("cassette " + cassetteId + " initialized.")
    else
        console.log("cassette " + cassetteId + " failed to initialize.")
    
    await setTimeout(() =>{},1000)
    
    return cmdV4ApiResponse;
}

export function restartCMDV4API() {
    console.log("restarting CMDV4 API");
    return new Promise(function(resolve, reject) {
        process.exec('sudo /etc/init.d/cmdv4rest stop')
        return setTimeout(() => {
            process.exec('sudo /etc/init.d/cmdv4rest start');
            //wait 1500ms to finish start
            return setTimeout(()=>{ console.log("restart CMDV4 API DONE"); resolve()},1500);
        },1500);
    });
}
