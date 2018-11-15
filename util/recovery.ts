import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as config from '../config/config';
import * as WebSocket from 'ws';
import * as responseHelper from '../util/responsebuilder';

let ws: WebSocket;

export async function sendReset(): Promise<any> {
    console.log("sending reset...\n");
    let cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"device", { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify({"reset": true})});

    if(cmdV4ApiResponse.ok) {
        let message = await util.waitForWebsocketEvent(ws, "resetDone");
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
    await initSingleCassette("1");
    await initSingleCassette("2");
    await initSingleCassette("3");
    await initSingleCassette("4");
    console.log("init cassettes done.");
}

async function initSingleCassette(cassetteId: string) {
    let updateInfo = {
        "updateWithCassetteCheck": true,
        "totalCount": 1000,
        "ndvCount": 1000
    }

    let confirmInfo = {
        "confirmCountWithError": true
    }

    let cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"cassettes/"+cassetteId, { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(updateInfo)});

    if(cmdV4ApiResponse.ok)
        cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"cassettes/"+cassetteId, { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "POST", body: JSON.stringify(confirmInfo)});

    if(cmdV4ApiResponse.ok)
        console.log("cassette " + cassetteId + " initialized.")
    else
        console.log("cassette " + cassetteId + " failed to initialize.")
    
    await setTimeout(() =>{},1000)
    
    return cmdV4ApiResponse;
}
