import * as i2c  from 'i2c-bus';
import * as ndef from 'ndef';
import * as util from './utils';

const DEVICE_ADDRESS = 0x53;
const TAG_ADDRESS = 0x05;

/**
 * Reads URI tag data from the connected I2C NFC tag
 */
export function readUriTag(): string {
    let wire = i2c.openSync(1);
    seek(wire, TAG_ADDRESS);
    let len = readNextByte(wire);
    let data = readNextBytes(wire, len);
    let result = ndef.uri.decodePayload(ndef.decodeMessage(data)[0].payload);
    wire.closeSync()
    return result;
}

/**
 * Writes URI tag data to the connected I2C NFC tag
 */
export async function writeUriTag(uri: string): Promise<void> {
    let wire = i2c.openSync(1);
    let tagdata = ndef.encodeMessage([ndef.uriRecord(uri)]);
    await writeBytes(wire, TAG_ADDRESS, Buffer.from([tagdata.length,...tagdata]));
    wire.closeSync();
}

function readNextByte(wire): number {
    return readNextBytes(wire, 1)[0];
}

function readNextBytes(wire, len: number): Buffer {
    let b = Buffer.alloc(len);
    wire.i2cReadSync(DEVICE_ADDRESS, len, b);
    return b;
}

function seek(wire, address: number): void {
    wire.i2cWriteSync(DEVICE_ADDRESS, 2, Buffer.from([address>>8, address&0xff]));
}

async function writeByte(wire, address: number, b: number): Promise<void> {
    wire.i2cWriteSync(DEVICE_ADDRESS, 3, Buffer.from([address>>8, address&0xff, b]));
    await util.asyncPause(5);
}

async function writeBytes(wire, address: number, buffer: Buffer): Promise<void> {
    for (let i=0; i<buffer.length; i++) {
        await writeByte(wire, address++, buffer[i]);
    }
}
