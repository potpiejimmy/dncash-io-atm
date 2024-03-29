export function parseCassetteData(cassetteApiInfo: any): any {
    let cassettes = {};
    for(var key in cassetteApiInfo) {
        if(cassetteApiInfo.hasOwnProperty(key)) {
            let id = Number.parseInt(key.substring(0,1));
            if(id > 0) {
                if(!cassettes[id])
                    cassettes[id] = {};

                if(key.endsWith("CUR")) {
                    cassettes[key.substring(0,1)]["currency"] = cassetteApiInfo[key];
                }
                
                if(key.endsWith("VAL")) {
                    cassettes[key.substring(0,1)]["denomination"] = cassetteApiInfo[key]*100;
                }
    
                if(key.endsWith("ACT")) {
                    cassettes[key.substring(0,1)]["count"] = cassetteApiInfo[key];
                }
            }
        }
    }

    return cassettes;
}

export function findPerfectCashoutDenomination(availableCassettes: any, token: any): any {
    let cashoutDenom = {
        "offerNotesWaitTime":20
    };

    if(token.info && token.info.denomData) {
        let denomData = token.info.denomData.filter(value => value.c > 0);
        for(var key in availableCassettes) {
            //check if we have correct currency symbol in both cases
            if(availableCassettes[key].currency == token.symbol && denomData.length > 0) {
                let cassette = availableCassettes[key];
                for(let i = 0; i < denomData.length; i++) {
                    if(cassette.denomination == denomData[i].d && cassette.count > denomData[i].c) {
                        cashoutDenom[key+"count"] = denomData[i].c;
                        //delete currency denom
                        denomData.splice(i,1);
                        break;
                    }
                }
            }
        }

        //check if there are some denoms missing
        if(denomData && denomData.length > 0) {
            //we have some denoms left which could not denominated
            for(let i = 0; i < denomData.length; i++) {
                if(denomData[i].c > 0) {
                    let amountLeft = denomData[i].c * denomData[i].d;
                    for(var key in availableCassettes) {
                        //check if we have correct currency symbol in both cases
                        if(availableCassettes[key].currency == token.symbol) {
                            let cassette = availableCassettes[key];
                            if(amountLeft%cassette.denomination == 0 && cassette.count > denomData[i].c) {
                                cashoutDenom[key+"count"] = amountLeft/cassette.denomination;
                                //delete currency denom
                                denomData.splice(i,1);
                                break;
                            }
                        }
                    }
                }
            }

        }
    }

    return cashoutDenom;
}