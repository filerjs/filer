define(function(require) {

  var IndexedDB = require('src/providers/indexeddb');
  var WebSQL = require('src/providers/websql');
  var Memory = require('src/providers/memory');
  var CryptoWrappers = require('src/providers/crypto-wrappers');

  return {
    IndexedDB: IndexedDB,
    WebSQL: WebSQL,
    Memory: Memory,

    /**
     * Wrappers for composing various types of providers
     */

    // Encryption Wrappers
    AESWrapper: CryptoWrappers.AESWrapper,
    TripleDESWrapper: CryptoWrappers.TripleDESWrapper,
    RabbitWrapper: CryptoWrappers.RabbitWrapper,
    // Convenience encryption wrapper
    EncryptionWrapper: CryptoWrappers.AESWrapper,


    /**
     * Convenience Provider references
     */

    // The default provider to use when none is specified
    Default: IndexedDB,

    // The Fallback provider does automatic fallback checks
    Fallback: (function() {
      if(IndexedDB.isSupported()) {
        return IndexedDB;
      }

      if(WebSQL.isSupported()) {
        return WebSQL;
      }

      function NotSupported() {
        throw "[IDBFS Error] Your browser doesn't support IndexedDB or WebSQL.";
      }
      NotSupported.isSupported = function() {
        return false;
      };
      return NotSupported;
    }())
  };
});
