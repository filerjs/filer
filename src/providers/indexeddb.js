define(function(require) {
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;

  var indexedDB = window.indexedDB       ||
                  window.mozIndexedDB    ||
                  window.webkitIndexedDB ||
                  window.msIndexedDB;


  var IDB_RW = require('src/constants').IDB_RW;
  var IDB_RO = require('src/constants').IDB_RO;

  function IndexedDBContext(db, mode) {
    var transaction = db.transaction(FILE_STORE_NAME, mode);
    this.objectStore = transaction.objectStore(FILE_STORE_NAME);
  }
  IndexedDBContext.prototype.clear = function(callback) {
    try {
      var request = this.objectStore.clear();
      request.onsuccess = function(event) {
        callback();
      };
      request.onerror = function(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };
  IndexedDBContext.prototype.get = function(key, callback) {
    try {
      var request = this.objectStore.get(key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(null, result);
      };
      request.onerror = function onerror(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };
  IndexedDBContext.prototype.put = function(key, value, callback) {
    try {
      var request = this.objectStore.put(value, key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(null, result);
      };
      request.onerror = function onerror(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };
  IndexedDBContext.prototype.delete = function(key, callback) {
    try {
      var request = this.objectStore.delete(key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(null, result);
      };
      request.onerror = function(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };


  function IndexedDB(name) {
    this.name = name || "local";
    this.db = null;
  }
  IndexedDB.isSupported = function() {
    return !!indexedDB;
  };

  IndexedDB.prototype.open = function(callback) {
    var that = this;

    // Bail if we already have a db open
    if( that.db ) {
      callback(null, false);
      return;
    }

    // Keep track of whether we're accessing this db for the first time
    // and therefore needs to get formatted.
    var firstAccess = false;

    // NOTE: we're not using versioned databases.
    var openRequest = indexedDB.open(that.name);

    // If the db doesn't exist, we'll create it
    openRequest.onupgradeneeded = function onupgradeneeded(event) {
      var db = event.target.result;

      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      db.createObjectStore(FILE_STORE_NAME);

      firstAccess = true;
    };

    openRequest.onsuccess = function onsuccess(event) {
      that.db = event.target.result;
      callback(null, firstAccess);
    };
    openRequest.onerror = function onerror(error) {
      callback(error);
    };
  };
  IndexedDB.prototype.getReadOnlyContext = function() {
    return new IndexedDBContext(this.db, IDB_RO);
  };
  IndexedDB.prototype.getReadWriteContext = function() {
    return new IndexedDBContext(this.db, IDB_RW);
  };

  return IndexedDB;
});
