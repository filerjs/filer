import Crypto from "./crypto";

const UUID_SHORT_REGEX = /^[0-9a-zA-Z]{22}$/;
const BASE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('');
const BASE_MAP = {};

for (var z = 0; z < BASE.length; z += 1) {
    var x = BASE[z];

    if (BASE_MAP[x] !== undefined) throw new TypeError(`${x} is ambiguous`)
      BASE_MAP[x] = z;
}

function encode(source) {
    if (source.length === 0) return ''

    var digits = [0]
    for (var i = 0; i < source.length; ++i) {
      for (var j = 0, carry = source[i]; j < digits.length; ++j) {
        carry += digits[j] << 8
        digits[j] = carry % BASE.length
        carry = (carry / BASE.length) | 0
      }

      while (carry > 0) {
        digits.push(carry % BASE.length)
        carry = (carry / BASE.length) | 0
      }
    }

    var string = "";

    for (var k = 0; source[k] === 0 && k < source.length - 1; ++k) 
      string += BASE[0];

    for (var q = digits.length - 1; q >= 0; --q) 
      string += BASE[digits[q]];

    return string
}

class UUID {
  static v4()
  {
    let buffer = new Uint8Array(16);
    Crypto.randomBytes(buffer);

    buffer[6] &= 0b00001111;
    buffer[6] |= 0b01000000;

    buffer[8] &= 0b00111111;
    buffer[8] |= 0b10000000;

    return encode(buffer);
  }

  static short()
  {
    return this.v4();
  }
}

export default UUID;