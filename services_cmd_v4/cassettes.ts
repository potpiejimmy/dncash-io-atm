import * as fetch from 'node-fetch';
import * as util from '../util/utils';
import * as config from '../config/config';
import * as response from '../util/responsebuilder';

export async function getCassetteData(ignoreCassetteDefect: boolean): Promise<any> {
    console.log("getting cassette data\n");
    //call CMDV4 API and get Cassette Info
    let cmdV4ApiResponse = await fetch.default(config.CMD_V4_API_URL+"cassettes", { agent: util.getAgent(config.CMD_V4_API_URL), headers: util.getJsonHeader(), method: "GET"});
    
    if(!cmdV4ApiResponse.ok)
        return response.buildErrorResponseFromCmdV4(cmdV4ApiResponse);
    else {
        let cassetteData = await cmdV4ApiResponse.json();
        console.log("cassette data CMDV4 api response: " + JSON.stringify(cassetteData) + "\n");
        return parseCassetteData(cassetteData, ignoreCassetteDefect);
    }
}

function parseCassetteData(cassetteApiInfo: any, ignoreCassetteDefect: boolean): any {
    let cassettes = [];
    for(var key in cassetteApiInfo) {
        if(cassetteApiInfo.hasOwnProperty(key)) {
            let id = Number.parseInt(key.substring(0,1));
            if(id > 0 && (ignoreCassetteDefect || (cassetteApiInfo[id+"STA"] && cassetteApiInfo[id+"STA"]==="R"))) {
                let cassetteInfo = cassettes.find( element => (element && element.id === id+""));

                if(!cassetteInfo) {
                    cassetteInfo = {"id": id+""};
                    cassettes.push(cassetteInfo);
                }

                if(key.endsWith("CUR")) {
                    cassetteInfo["currency"] = cassetteApiInfo[key];
                }
                
                if(key.endsWith("VAL")) {
                    cassetteInfo["denomination"] = cassetteApiInfo[key]*100;
                }
    
                if(key.endsWith("ACT")) {
                    cassetteInfo["count"] = cassetteApiInfo[key];
                }
            }
        }
    }

    if(cassettes.length <= 0)
        cassettes = response.buildApiErrorResponse("No cassette is working at the moment. Executing reset...", "FAILED");

    return cassettes;
}

export function findPerfectCashoutDenomination(availableCassettes: any, token: any): any {

    //if no denom or no algo set -> use always least notes!
    if(token.info && token.info.denomData)
        return requestedDenomAlgorithm(availableCassettes, token);
    else 
        return leastNotesAlgorithm(availableCassettes, token.amount);
}

function requestedDenomAlgorithm(availableCassettes :any, token: any): any {
    console.log("Calculating denom with requestedDenomAlgo");
    let cashoutDenom = {
        "offerNotesWaitTime":20,
    };

    let foundDenom = false;
    let amountLeft = token.amount;

    //try to match the denom!
    if(token.info && token.info.denomData) {
        let denomData = token.info.denomData.filter(value => value.c > 0);
        availableCassettes.forEach(cassette => {
            //check if we have correct currency symbol in both cases
            if(cassette.currency == token.symbol && denomData.length > 0) {
                for(let j = 0; j < denomData.length; j++) {
                    if(cassette.denomination == denomData[j].d && cassette.count > 0) {
                        console.log("Kassette: " + JSON.stringify(cassette));
                        console.log("Denom: " + JSON.stringify(denomData[j]));
                        console.log("AmountLeft:" + amountLeft);
                        //we have a denomination match!
                        let notesToWithdraw = cassette.count > denomData[j].c ? denomData[j].c : cassette.count;
                        if(notesToWithdraw > 0) {
                            console.log("notes to withdraw: " + notesToWithdraw);
                            cashoutDenom[cassette.id+"count"] = notesToWithdraw;
                            cassette.count -= notesToWithdraw;
                            amountLeft -= denomData[j].d * notesToWithdraw;
                            foundDenom = true;

                            denomData.splice(j,1);
                        }
                        console.log("current denom after calc: " + JSON.stringify(cashoutDenom));
                        console.log("AmountLeft after calc: " + amountLeft + "\n")
                        break;
                    }
                }
            }
        });

        console.log("denom after requDenomAlgo: " + JSON.stringify(cashoutDenom));

        //check if we have some amount left
        if(amountLeft > 0) {
            //we have some denoms left which could not be denominated
            return leastNotesAlgorithm(availableCassettes, amountLeft, cashoutDenom);   
        }
    }

    return {foundDenom: foundDenom, cashoutDenom: cashoutDenom};
}

function leastNotesAlgorithm(availableCassettes: any, amountLeft: any, currentCashoutDenom? : any): any {
    console.log("Calculating denom with leastNotesAlgo");
    console.log("current cassettes in least notes algo: " + JSON.stringify(availableCassettes));
    console.log("Current amount left in least notes algo:" + amountLeft);
    console.log("current denom in least notes algo: " + JSON.stringify(currentCashoutDenom) + "\n");

    let cashoutDenom = currentCashoutDenom ? currentCashoutDenom : {"offerNotesWaitTime":20};

    let foundDenom = currentCashoutDenom ? currentCashoutDenom.foundDenom : false;

    //sort cassette list with biggest denom first!
    availableCassettes.sort((cassA, cassB) => cassB.denomination - cassA.denomination);
    console.log("sorted cassettes: " + JSON.stringify(availableCassettes));
    
    //check if we can actually withdraw some money!
    availableCassettes.forEach(cassette => {
        console.log("cassette denom: " + cassette.denomination);
        console.log("amount left:" + amountLeft);

        if(cassette.denomination <= amountLeft) {
            let requestedNumberOfNotesToWithdraw = (amountLeft - amountLeft%cassette.denomination) / cassette.denomination;
            let capableNotesToWithdraw = (cassette.count > requestedNumberOfNotesToWithdraw) ? requestedNumberOfNotesToWithdraw : cassette.count;
            console.log("Cassette: " + JSON.stringify(cassette) + " and cabable to withdraw: " + capableNotesToWithdraw);

            if(capableNotesToWithdraw > 0) {
                foundDenom = true;
                if(cashoutDenom[cassette.id+"count"])
                    cashoutDenom[cassette.id+"count"] += capableNotesToWithdraw;
                else
                    cashoutDenom[cassette.id+"count"] = capableNotesToWithdraw;
    
                amountLeft -= capableNotesToWithdraw * cassette.denomination;
                cassette.count -= capableNotesToWithdraw;
                console.log("amoutn left after calc: " + amountLeft);
            }
        }
    });

    return {foundDenom: foundDenom, cashoutDenom: cashoutDenom};
}
