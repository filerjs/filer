const crypto = require("crypto");
const uuidparse = require("uuid-parse");

let buffer = new Uint8Array(16);
crypto.randomFillSync(buffer);
console.log(buffer);

buffer[6] &= 0b00001111;
buffer[6] |= 0b01000000;

buffer[8] &= 0b00111111;
buffer[8] |= 0b10000000;

console.log(buffer);
console.log(uuidparse.unparse(buffer));