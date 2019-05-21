import * as WebSocket from 'ws';
import * as config from '../config/config';

let wss;

export function init() {
    //INTIALIZE LOCAL WEBSOCKET SERVER
    wss = new WebSocket.Server({
        port: 8080,
        perMessageDeflate: {
          zlibDeflateOptions: { // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3,
          },
          // Other options settable:
          clientNoContextTakeover: true, // Defaults to negotiated value.
          serverNoContextTakeover: true, // Defaults to negotiated value.
          clientMaxWindowBits: 10,       // Defaults to negotiated value.
          serverMaxWindowBits: 10,       // Defaults to negotiated value.
          // Below options specified as default values.
          concurrencyLimit: 10,          // Limits zlib concurrency for perf.
          threshold: 1024,               // Size (in bytes) below which messages
                                         // should not be compressed.
        }
    });

    console.log("CMD V4 WebSocker Server initialized");
}

function dispenseFailed() {
    if(wss) wss.clients.forEach(client => client.send(JSON.stringify({"eventType": "dispense","notesTaken": false,"timeout": true})));
}

function dispenseOk() {
    if(wss) wss.clients.forEach(client => client.send(JSON.stringify({"eventType": "dispense","notesTaken": true,"timeout": false})));
}

export function sendTestResponse() {
    console.log("send test dispense event");
    if(config.IS_OK_DISPENSE)
        dispenseOk();
    else
        dispenseFailed();
}

