import * as fetch from 'node-fetch';
import * as mqtt from 'mqtt';
import * as config from './config';
import * as cashApi from './services/cashapi.service';
import * as WebSocket from 'ws';
import * as util from './util';
import * as test from './test';

console.log("=== The ultimate banking machine API: " + new Date() + " ===\n");

if (!config.DN_CASH_API_KEY || !config.DN_CASH_API_SECRET) {
    console.log("Please set DN_CLEARING_API_KEY and DN_CLEARING_API_SECRET environment variables.");
    process.exit(1);
}

let ws = new WebSocket(config.CMD_V4_API_EVENT_URL);

ws.onopen = () => {
    console.log("CMD V4 WebSocket OPEN");
};

ws.onerror = m => {
    console.log("CMD V4 WebSocket ERR: " + m.message);
};

ws.onclose = m => {
    console.log("CMD V4 WebSocket CLOSE: " + m.reason);
};

ws.onmessage = m => {
    let event = JSON.parse(m.data.toString());
    console.log("EVENT:" + JSON.stringify(event));
    if(event.eventType === "dispense" && event.timeout && !event.notesTaken) {
        sendRetract();
    }
}

cashApi.createTrigger(99999999999).then(res => {
    console.log(JSON.stringify(res));
    let c = mqtt.connect(config.DN_MQTT_URL);
    c.on('connect', () => {
        console.log("MQTT connected");
        this.nfctrigger = res.triggercode;
        c.subscribe('dncash-io/trigger/' + res.triggercode);
    });
    c.on('message', (topic, message) => {
        console.log("Received token: " + message.toString() + "\n");
        let msg = JSON.parse(message.toString());
        tokenReceived(msg.token).then(res => {
            //send retract or not retract event
            if(config.IS_TEST_MODE) //execute retract
                test.dispenseFailed();
        });
    });
    c.on('error', err => {
        console.log("MQTT not ready: " + err);
    });
})

function tokenReceived(token: any) : Promise<any> {
    //call CMDV4 API and get Cassette Info
    return getCassetteData().then(cassetteData => {
        console.log("Cassettes: " + cassetteData + "\n");
        let cashoutRequest = util.findPerfectCashoutDenomination(cassetteData, token);
        console.log("CashoutRequest: " + JSON.stringify(cashoutRequest) + "\n");
        //call CMDV4 API to dispense notes
        return dispense(cashoutRequest).then(res => {
            console.log("dispensed: " + JSON.stringify(res) + "\n");
            return res;
        });
    });
}

function getCassetteData() : Promise<any> {
    //call CMDV4 API and get Cassette Info
    return fetch.default(config.CMD_V4_API_URL+"cassettes", { headers: {"Content-Type": "application/json"}, method: "GET"}).then(res => res.json()).then(res => {
        return util.parseCassetteData(res);
    });
}

function dispense(cashoutRequest: any) : Promise<any> {
    return fetch.default(config.CMD_V4_API_URL+"dispense", { headers: {"Content-Type": "application/json"}, method: "POST"}, cashoutRequest).then(res => res.json()).then(res => {
        console.log(JSON.stringify(res));
        return res;
    });
}

function sendRetract() {
    console.log("sending retract...");
    return fetch.default(config.CMD_V4_API_URL+"dispense", { headers: {"Content-Type": "application/json"}, method: "POST"}, {"retractWithTray": true}).then(res => res.json()).then(res => {
        console.log(JSON.stringify(res)+"\n");
    });
}
