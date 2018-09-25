//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "h1mp58gx03wtck1c45krc4pbmz6565kan0b26gqcep631wvk6n667awj4xavu52d";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "zdzcp909a38283jy9fhxmkzgz5hne9cynueut2h7u7y41p624mq5m63804wcz6nz";
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'http://localhost:3000/dnapi/cash/v1/';
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'wss://test.mosquitto.org:8081';
//DEVICE_ID FOR THIS ATM
export const DN_DEVICE_ID = process.env.DN_DEVICE_ID || '9c1c1f8f-a00b-45d0-849c-4138a5f38453';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "https://154a1710-6eab-45f2-8e45-5e01ecfc5564.mock.pstmn.io/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:8899/cmdv4/v1/events";
//PARAMETER FOR TESTMODE
export const IS_TEST_MODE = process.env.IS_TEST_MODE || true;
