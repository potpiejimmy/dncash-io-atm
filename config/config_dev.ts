//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "u6xbj5wz0q7q8u62muhzbm6awtq6mn0b10kh7dmrz9xvmrug4ubp7qnvwyv6mqp6";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "tjvxtbjdntxjg52cy2wtz34e7n44vfk72fcy17rxg44xd7z929y40ryqeet9qccg";
//USE STATIC TRIGGER
export const USE_STATIC_TRIGGER = process.env.USE_STATIC_TRIGGER || true;
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'http://localhost:8096/dnapi/cash/v1/';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "https://1bba0bcb-eaf3-4720-8173-8590fe3c45df.mock.pstmn.io/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:80/cmdv4/v1/events";
//USE MQTT OR HTTP REQUEST
export const USE_MQTT = process.env.USE_MQTT || false;
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'mqtt://52.59.204.65:1883';
//MQTT USER
export const DN_MQTT_USER = process.env.DN_MQTT_USER || 'dncashio';
//MQTT PASSWIRD
export const DN_MQTT_PASSWORD = process.env.DN_MQTT_PASSWORD || 'dncashio';
//USE PROXY TO TUNNEL HTTPS REQUESTS
export const USE_PROXY = process.env.USE_PROXY || true;
//PROXY URL FOR HTTPS REQUESTS
export const PROXY_URL = process.env.PROXY_URL || 'http://proxy.wincor-nixdorf.com:81';
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
export const IS_TEST_MODE = process.env.IS_TEST_MODE || true;
//TAKES ONLY EFFECT WHEN TESTING MODE IS ENABLED
export const IS_OK_DISPENSE = process.env.IS_OK_DISPENSE || true;
//DEVICE_ID FOR THIS ATM
export const DN_DEVICE_ID = process.env.DN_DEVICE_ID || '9d5be08f-16c3-44a9-8a04-44c46ed55cb8';
