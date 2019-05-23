import * as recovery from './recovery';

export function buildErrorResponseFromCmdV4(cmdV4ApiResponse: any) {
    let addInfo;

    if(!cmdV4ApiResponse) {
        addInfo = {key:"restart", value: true}
        //nothing works anymore, restart Pi but let token update happen! (timeout in restartPi() function)
        recovery.restartPi(); //will happen in 3 seconds
        return buildApiErrorResponse("CMDV4 API not responding.", "FAILED");
    }
    else if(cmdV4ApiResponse.status == 500) {
        return cmdV4ApiResponse.json().then(apiErrorResponse => {
            if(apiErrorResponse.errors && apiErrorResponse.errors.length > 0) {
                if(apiErrorResponse.errors[0].msg === "Couldn't open device. Probably it is not connected") {
                    addInfo = {key:"restart", value: true}
                    //nothing works anymore, restart Pi but let token update happen! (timeout in restartPi() function)
                    recovery.restartPi(); //will happen in 3 seconds
                }

                return buildApiErrorResponse(apiErrorResponse.errors[0].msg, "FAILED", addInfo);
            } else
                return buildApiErrorResponse("Getting status " + cmdV4ApiResponse.status);
        });
    } else {
        return buildApiErrorResponse("Getting http status " + cmdV4ApiResponse.status);
    }
}

export function buildApiErrorResponse(message?: string, type?: string, addInfo?: any): any {
    let errorResponse = {
        failed: true,
        type: type || "FAILED",
        message: message || "Something went wrong while trying to dispense money."
    }

    if(addInfo)
        errorResponse[addInfo.key] = addInfo.value;

    return errorResponse;
}

export function createTokenUpdateResponse(tokenState: string, amount: Number, info: any): any {
    return {
        amount: amount,
        state: tokenState,
        lockrefname: "CMD V4 API",
        processing_info: info
    }
}