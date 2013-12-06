define(function(require) {

  var CryptoAdapters = require('src/adapters/crypto');
  var ZlibAdapter = require('src/adapters/zlib');

  return {

    // Encryption Adatpers
    AES: CryptoAdapters.AES,
    TripleDES: CryptoAdapters.TripleDES,
    Rabbit: CryptoAdapters.Rabbit,

    // Compression Adapters
    Zlib: ZlibAdapter,

    // Convenience adapters (provide default choices)
    Compression: ZlibAdapter,
    Encryption: CryptoAdapters.AES

  };
});
