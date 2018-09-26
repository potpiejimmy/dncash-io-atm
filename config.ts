//API KEY AND SECRET FOR DNCASH.IO
export const DN_CASH_API_KEY = process.env.DN_CASH_API_KEY || "g5hwqhaj8d5u845tpvbdp0tzqv9gf2j77fwxbzzp38tcw8xq22766be2g6egkvtc";
export const DN_CASH_API_SECRET = process.env.DN_CASH_API_SECRET || "500bgw44nhbw79mar7v1mg0u3xwxch9nujr40d4nm0kwujtt4k92m7dwwk4rybea";
//API URL FOR DNCASH.IO
export const DN_API_URL = process.env.DN_API_URL || 'http://localhost:3000/dnapi/cash/v1/';
//MQTT URL FOR DNCASH.IO
export const DN_MQTT_URL = process.env.DN_MQTT_URL || 'wss://test.mosquitto.org:8081';
//DEVICE_ID FOR THIS ATM
export const DN_DEVICE_ID = process.env.DN_DEVICE_ID || 'dac4e693-fdce-4520-ae0c-d5476812a88e';
//CMD V4 API URL
export const CMD_V4_API_URL = process.env.CMD_V4_API_URL || "https://1bba0bcb-eaf3-4720-8173-8590fe3c45df.mock.pstmn.io/";
//CMD V4 EVENT API URL
export const CMD_V4_API_EVENT_URL = process.env.CMD_V4_API_EVENT_URL || "ws://localhost:8899/cmdv4/v1/events";
//PARAMETER FOR TESTMODE
export const IS_TEST_MODE = process.env.IS_TEST_MODE || true;
//TAKES ONLY EFFECT WHEN TESTING MODE IS ENABLED
export const IS_OK_DISPENSE = process.env.IS_OK_DISPENSE || true;
