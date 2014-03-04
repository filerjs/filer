define(function(require) {

  require("crypto-js/rollups/sha256"); var Crypto = CryptoJS;

  function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  function hash(string) {
    return Crypto.SHA256(string).toString(Crypto.enc.hex);
  }

  function nop() {}

  /**
   * Convert a Uint8Array to a regular array
   */
  function u8toArray(u8) {
    var array = [];
    var len = u8.length;
    for(var i = 0; i < len; i++) {
      array[i] = u8[i];
    }
    return array;
  }

  return {
    guid: guid,
    hash: hash,
    u8toArray: u8toArray,
    nop: nop
  };

});
