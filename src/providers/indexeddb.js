var FILE_SYSTEM_NAME = require('../constants.js').FILE_SYSTEM_NAME;
var FILE_STORE_NAME = require('../constants.js').FILE_STORE_NAME;
var IDB_RW = require('../constants.js').IDB_RW;
var IDB_RO = require('../constants.js').IDB_RO;

function IndexedDBContext(db, mode) {
  this.db = db;
  this.mode = mode;
}

IndexedDBContext.prototype._getObjectStore = function() {
  if(this.objectStore) {
    return this.objectStore;
  }

  var transaction = this.db.transaction(FILE_STORE_NAME, this.mode);
  this.objectStore = transaction.objectStore(FILE_STORE_NAME);
  return this.objectStore;
};

IndexedDBContext.prototype.clear = function(callback) {
  try {
    var objectStore = this._getObjectStore();
    var request = objectStore.clear();
    request.onsuccess = function() {
      callback();
    };
    request.onerror = function(event) {
      event.preventDefault();
      callback(event.error);
    };
  } catch(err) {
    callback(err);
  }
};

IndexedDBContext.prototype._get = function(key, callback) {
  try {
    var objectStore = this._getObjectStore();
    var request = objectStore.get(key);
    request.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(null, result);
    };
    request.onerror = function(event) {
      event.preventDefault();
      callback(event.error);
    };
  } catch(err) {
    callback(err);
  }
};
IndexedDBContext.prototype.getObject = function(key, callback) {
  this._get(key, callback);
};
IndexedDBContext.prototype.getBuffer = function(key, callback) {
  this._get(key, function(err, arrayBuffer) {
    if(err) {
      return callback(err);
    }
    callback(null, Buffer.from(arrayBuffer));
  });
};

IndexedDBContext.prototype._put = function(key, value, callback) {
  try {
    var objectStore = this._getObjectStore();
    var request = objectStore.put(value, key);
    request.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(null, result);
    };
    request.onerror = function(event) {
      event.preventDefault();
      callback(event.error);
    };
  } catch(err) {
    callback(err);
  }
};
IndexedDBContext.prototype.putObject = function(key, value, callback) {
  this._put(key, value, callback);
};
IndexedDBContext.prototype.putBuffer = function(key, uint8BackedBuffer, callback) {
  var buf = uint8BackedBuffer.buffer;
  this._put(key, buf, callback);
};

IndexedDBContext.prototype.delete = function(key, callback) {
  try {
    var objectStore = this._getObjectStore();
    var request = objectStore.delete(key);
    request.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(null, result);
    };
    request.onerror = function(event) {
      event.preventDefault();
      callback(event.error);
    };
  } catch(err) {
    callback(err);
  }
};


function IndexedDB(name) {
  this.name = name || FILE_SYSTEM_NAME;
  this.db = null;
}
IndexedDB.isSupported = function() {
  var indexedDB = global.indexedDB       ||
                  global.mozIndexedDB    ||
                  global.webkitIndexedDB ||
                  global.msIndexedDB;
  return !!indexedDB;
};

IndexedDB.prototype.open = function(callback) {
  var that = this;

  // Bail if we already have a db open
  if(that.db) {
    return callback();
  }

  try {
    var indexedDB = global.indexedDB       ||
                    global.mozIndexedDB    ||
                    global.webkitIndexedDB ||
                    global.msIndexedDB;

    // NOTE: we're not using versioned databases.
    var openRequest = indexedDB.open(that.name);

    // If the db doesn't exist, we'll create it
    openRequest.onupgradeneeded = function onupgradeneeded(event) {
      var db = event.target.result;

      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      db.createObjectStore(FILE_STORE_NAME);
    };

    openRequest.onsuccess = function onsuccess(event) {
      that.db = event.target.result;
      callback();
    };
    openRequest.onerror = function onerror(event) {
      event.preventDefault();
      callback(event.error);
    };
  } catch(err) {
    callback(err);
  }
};

IndexedDB.prototype.getReadOnlyContext = function() {
  return new IndexedDBContext(this.db, IDB_RO);
};
IndexedDB.prototype.getReadWriteContext = function() {
  return new IndexedDBContext(this.db, IDB_RW);
};

module.exports = IndexedDB;
