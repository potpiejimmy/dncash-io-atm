import * as fetch from 'node-fetch';
import * as process  from 'child_process';
import * as WebSocket from 'ws';
import * as util from '../util/utils';
import * as config from '../config/config';
import * as responseHelper from '../util/responsebuilder';

let ws: WebSocket;

export async function sendReset(canCancel?: boolean): Promise<any> {
    console.log("sending reset...\n");
    let cmdV4ApiResponse;
    try {
        cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"device", { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify({"reset": true})});
    } catch(err) {
        if(!canCancel) {
            await restartCMDV4API();
            return sendReset(true);
        }
    }

    if(cmdV4ApiResponse && cmdV4ApiResponse.ok) {
        console.log("waiting for 'resetDone' event...");
        let message
        try {
            message = await util.waitForWebsocketEvent(ws, "resetDone", 60000);
        } catch(err) {
            return responseHelper.buildApiErrorResponse("No WebSocket event was triggered", "FAILED");
        }
        if(message) {
            let event = JSON.parse(message.toString());
            if(event.eventType === "resetDone")
                return initCassettes();
        }
    } else {
        return responseHelper.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    }
}

export async function initCassettes() : Promise<void> {
    console.log("sending init cassettes...\n");
    await initSingleCassette("1");
    await initSingleCassette("2");
    await initSingleCassette("3");
    await initSingleCassette("4");
    console.log("init cassettes done.");
}

async function initSingleCassette(cassetteId: string, canCancel?: boolean) {
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
        if(!canCancel) {
            await restartCMDV4API();
            return initSingleCassette(cassetteId,true);
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
    
    await util.asyncPause(1000);
    
    return cmdV4ApiResponse;
}

export function restartCMDV4API() {
    console.log("restarting CMDV4 API");
    return new Promise(async function(resolve, reject) {
        process.exec('sudo /etc/init.d/cmdv4rest stop')
        await util.asyncPause(1500);
        
        process.exec('sudo /etc/init.d/cmdv4rest start');
        //wait 1500ms to finish start
        await util.asyncPause(1500);
        
        console.log("restart CMDV4 API DONE");
        resolve();
    });
}

export function restartPi() {
    console.log("restarting Raspberry Pi in 3 seconds ...");
    util.changeLED('off');
    setTimeout(() => {process.exec('sudo init 6')},3000);
}
