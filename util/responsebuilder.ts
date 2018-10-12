export function buildErrorResponseFromCmdV4(cmdV4ApiResponse: any) {
    if(cmdV4ApiResponse.status == 500) {
        return cmdV4ApiResponse.json().then(apiErrorResponse => {
            if(apiErrorResponse.errors && apiErrorResponse.errors.length > 0) {
                return buildApiErrorResponse(apiErrorResponse.errors[0].msg);
            } else
                return buildApiErrorResponse("Getting status " + cmdV4ApiResponse.status);
        });
    } else {
        return buildApiErrorResponse("Getting http status " + cmdV4ApiResponse.status);
    }
}

export function buildApiErrorResponse(message?: string, type?: string): any {
    let errorResponse = {
        failed: true,
        type: type || "FAILED",
        message: message || "Something went wrong while trying to dispense money."
    }

    return errorResponse;
}


export function createTokenUpdateResponse(tokenState: string, amount: Number, info: string): any {
    return {
        amount: amount,
        state: tokenState,
        lockrefname: "CMD V4 API",
        processing_info: info
    }
}