var TextEncoder = require('../lib/encoding.js').TextEncoder;
var TextDecoder = require('../lib/encoding.js').TextDecoder;
var BufferUtils = require('./buffer-utils.js');

// Adapt encodings to work with Buffer or Uint8Array, they expect the latter
function decode(buf) {
  buf = BufferUtils.ensureUint8Array(buf);
  return (new TextDecoder('utf8')).decode(buf);
}

function encode(string) {
  var u8 = (new TextEncoder('utf8')).encode(string);
  return BufferUtils.ensureBuffer(u8);
}

module.exports = {
  encode: encode,
  decode: decode
};
