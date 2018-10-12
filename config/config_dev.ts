//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "0p5y12pvxaeuhyu12gcfa0zu0d7v5vhj4znyyk2x2pd43tg5zf84c64efa6ce6wa";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "0p0eec7y2a06v6552zthajw9n385ufv4ub1fhdge21f94g1g2xkd0rq81jrfgdfx";
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'http://localhost:3000/dnapi/cash/v1/';
//DEVICE_ID FOR THIS ATM
export const DN_DEVICE_ID = process.env.DN_DEVICE_ID || '09cf01ed-125e-4145-8d6c-2e09c550044b';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "https://1bba0bcb-eaf3-4720-8173-8590fe3c45df.mock.pstmn.io/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:80/cmdv4/v1/events";
//USE MQTT OR HTTP REQUEST
export const USE_MQTT = process.env.USE_MQTT || false;
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'wss://mosquitto.dn-sol.net';
//USE PROXY TO TUNNEL HTTPS REQUESTS
export const USE_PROXY = process.env.USE_PROXY || true;
//PROXY URL FOR HTTPS REQUESTS
export const PROXY_URL = process.env.PROXY_URL || 'http://proxy.wincor-nixdorf.com:81';
//USE NFC TAG
export const USE_NFC_TAG = process.env.USE_NFC_TAG || false;
//NFC TAG API URL
export const NFC_TAG_API_URL = process.env.NFC_TAG_API_URL || "http://localhost:5555";


/*
#############################################
####### TESTING PARAMETERS - DEV ONLY #######
#############################################
*/
//PARAMETER FOR TESTMODE
export const IS_TEST_MODE = process.env.IS_TEST_MODE || true;
//TAKES ONLY EFFECT WHEN TESTING MODE IS ENABLED
export const IS_OK_DISPENSE = process.env.IS_OK_DISPENSE || true;
