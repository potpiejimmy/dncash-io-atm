//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "a1bptmxja98z0yar23zydk41hd7dth6anx3xv5nrqv0mngmzp9t570znmya3rb5t";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "t3fajtnqun507jx9vqz189qz2kmd95r0px7ja2ujpeerm0kz4jbrt0xub4y6nz06";
//USE STATIC TRIGGER
export const USE_STATIC_TRIGGER = process.env.USE_STATIC_TRIGGER || true;
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'https://dncashapi.dn-sol.net/dnapi/cash/v1/';
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
//MQTT PUBLIC KEY TO VERIFY TOKEN
export const DN_MQTT_PUB_KEY = process.env.DN_MQTT_PUB_KEY || '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJ5W3+QfNgZaMoW2QiVpxtBg556IgD4y\nzWDFyurMsT5qBPkJulPxtTd8Kf81mkA79BOKbZiRT3U0QGowJYUaxTsCAwEAAQ==\n-----END PUBLIC KEY-----';
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
