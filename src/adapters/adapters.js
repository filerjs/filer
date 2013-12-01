define(function(require) {

  var CryptoAdapters = require('src/adapters/crypto');

  return {

    // Encryption Adatpers
    AES: CryptoAdapters.AES,
    TripleDES: CryptoAdapters.TripleDES,
    Rabbit: CryptoAdapters.Rabbit,
    // Convenience encryption wrapper (default to AES)
    Encryption: CryptoAdapters.AES

  };
});
