//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "1n0zv78akj6zzz0qwv8mfeaf217bax1yy89akumjhwjexburv08z72k5vc73pkw7";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "xj3jnhjzmj2gkveqw38aeeumgddt0rna858z3mc5jkx6p3f74jxnkm2ueh7a8tfx";
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'https://dncashapi.dn-sol.net/dnapi/cash/v1/';
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'wss://mosquitto.dn-sol.net';
//DEVICE_ID FOR THIS ATM
export const DN_DEVICE_ID = process.env.DN_DEVICE_ID || '31df1ac3-3006-4bbf-826f-4060195437e9';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "http://localhost:80/cmdv4/v1/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:80/cmdv4/v1/events";

/*
####### TESTING PARAMETERS - DEV ONLY #######
*/
//PARAMETER FOR TESTMODE
export const IS_TEST_MODE = process.env.IS_TEST_MODE || false;
//TAKES ONLY EFFECT WHEN TESTING MODE IS ENABLED
export const IS_OK_DISPENSE = process.env.IS_OK_DISPENSE || true;
