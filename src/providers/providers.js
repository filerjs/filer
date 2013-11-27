define(function(require) {

  var IndexedDB = require('src/providers/indexeddb');
  var WebSQL = require('src/providers/websql');
  var Memory = require('src/providers/memory');

  return {
    IndexedDB: IndexedDB,
    WebSQL: WebSQL,
    Memory: Memory,
    Default: IndexedDB,
    // The Legacy provider does automatic fallback checks
    Legacy: (function() {
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
