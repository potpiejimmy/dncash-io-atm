//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "1n0zv78akj6zzz0qwv8mfeaf217bax1yy89akumjhwjexburv08z72k5vc73pkw7";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "xj3jnhjzmj2gkveqw38aeeumgddt0rna858z3mc5jkx6p3f74jxnkm2ueh7a8tfx";
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'https://dncashapi.dn-sol.net/dnapi/cash/v1/';
//DEVICE_ID FOR THIS ATM
export const DN_DEVICE_ID = process.env.DN_DEVICE_ID || '31df1ac3-3006-4bbf-826f-4060195437e9';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "http://localhost:80/cmdv4/v1/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:80/cmdv4/v1/events";
//USE MQTT OR HTTP REQUEST
export const USE_MQTT = process.env.USE_MQTT || false;
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'wss://mosquitto.dn-sol.net';
//USE PROXY TO TUNNEL HTTPS REQUESTS
export const USE_PROXY = process.env.USE_PROXY || true;
//PROXY URL FOR HTTPS REQUESTS
export const PROXY_URL = process.env.PROXY_URL || 'http://proxy.wincor-nixdorf.com:81/';
//USE NFC TAG
export const WRITE_NFC_TAG = process.env.WRITE_NFC_TAG || false;
//NFC TAG API URL
export const NFC_TAG_API_URL = process.env.NFC_TAG_API_URL || "http://localhost:5555/";


/*
#############################################
####### TESTING PARAMETERS - DEV ONLY #######
#############################################
*/
//PARAMETER FOR TESTMODE
export const IS_TEST_MODE = process.env.IS_TEST_MODE || true;
//TAKES ONLY EFFECT WHEN TESTING MODE IS ENABLED
export const IS_OK_DISPENSE = process.env.IS_OK_DISPENSE || true;
