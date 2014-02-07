define(function(require) {

  var IndexedDB = require('./indexeddb');
  var WebSQL = require('./websql');
  var Memory = require('./memory');

  return {
    IndexedDB: IndexedDB,
    WebSQL: WebSQL,
    Memory: Memory,

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
        throw "[Filer Error] Your browser doesn't support IndexedDB or WebSQL.";
      }
      NotSupported.isSupported = function() {
        return false;
      };
      return NotSupported;
    }())
  };
});
