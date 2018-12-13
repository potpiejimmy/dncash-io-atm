//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "m0bmhdgabgzt4ab80fwr2rn9cb8ht4da82988m80tbk8npv91vju5pgdyvvndv7n";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "cjw52dy8k9xah7zumqr2gqpfub8h4f9t7extw7td9mahy55tvnd2kqugx3pbf892";
//USE STATIC TRIGGER
export const USE_STATIC_TRIGGER = process.env.USE_STATIC_TRIGGER || true;
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'https://api.dncash.io/dnapi/cash/v1/';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "http://localhost:80/cmdv4/v1/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:80/cmdv4/v1/events";
//USE MQTT OR HTTP REQUEST
export const USE_MQTT = process.env.USE_MQTT || true;
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'mqtt://52.59.204.65:1883';
//MQTT USER
export const DN_MQTT_USER = process.env.DN_MQTT_USER || 'dncashio';
//MQTT PASSWIRD
export const DN_MQTT_PASSWORD = process.env.DN_MQTT_PASSWORD || 'dncashio';
//USE PROXY TO TUNNEL HTTPS REQUESTS
export const USE_PROXY = process.env.USE_PROXY || false;
//PROXY URL FOR HTTPS REQUESTS
export const PROXY_URL = process.env.PROXY_URL || 'http://proxy.wincor-nixdorf.com:81/';
//USE NFC TAG
export const WRITE_NFC_TAG = process.env.WRITE_NFC_TAG || false;
//NFC TAG API URL
export const NFC_TAG_API_URL = process.env.NFC_TAG_API_URL || "http://localhost:5555/";
//NFC TAG URL
export const NFC_TAG_URL = process.env.NFC_TAG_URL || "https://dncashatm.dn-sol.net/dncashdemo.html?triggercode=";


/*
#############################################
####### TESTING PARAMETERS - DEV ONLY #######
#############################################
*/
//PARAMETER FOR TESTMODE
export const IS_TEST_MODE = process.env.IS_TEST_MODE || false;
//TAKES ONLY EFFECT WHEN TESTING MODE IS ENABLED
export const IS_OK_DISPENSE = process.env.IS_OK_DISPENSE || true;
