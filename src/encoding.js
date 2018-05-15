// Adapt encodings to work with Buffer or Uint8Array, they expect the latter
function decode(buf) {
  return buf.toString('utf8');
}

function encode(string) {
  return new Buffer(string, 'utf8');
}

// https://github.com/darkskyapp/string-hash
function hash32(string) {
  var hash = 5381;
  var i = string.length;

  while(i) {
    hash = (hash * 33) ^ string.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
}

module.exports = {
  encode: encode,
  decode: decode,
  hash32: hash32
};
