var FILE_SYSTEM_NAME = require('../constants.js').FILE_SYSTEM_NAME;
var asyncCallback = require('../../lib/async.js').nextTick;

/**
 * Make shared in-memory DBs possible when using the same name.
 */
var createDB = (function() {
  var pool = {};
  return function getOrCreate(name) {
    var firstAccess = !pool.hasOwnProperty(name);
    if(firstAccess) {
      pool[name] = {};
    }
    return {
      firstAccess: firstAccess,
      db: pool[name]
    };
  };
}());

function MemoryContext(db, readOnly) {
  this.readOnly = readOnly;
  this.objectStore = db;
}
MemoryContext.prototype.clear = function(callback) {
  if(this.readOnly) {
    asyncCallback(function() {
      callback("[MemoryContext] Error: write operation on read only context");
    });
    return;
  }
  var objectStore = this.objectStore;
  Object.keys(objectStore).forEach(function(key){
    delete objectStore[key];
  });
  asyncCallback(callback);
};
MemoryContext.prototype.get = function(key, callback) {
  var that = this;
  asyncCallback(function() {
    callback(null, that.objectStore[key]);
  });
};
MemoryContext.prototype.put = function(key, value, callback) {
  if(this.readOnly) {
    asyncCallback(function() {
      callback("[MemoryContext] Error: write operation on read only context");
    });
    return;
  }
  this.objectStore[key] = value;
  asyncCallback(callback);
};
MemoryContext.prototype.delete = function(key, callback) {
  if(this.readOnly) {
    asyncCallback(function() {
      callback("[MemoryContext] Error: write operation on read only context");
    });
    return;
  }
  delete this.objectStore[key];
  asyncCallback(callback);
};


function Memory(name) {
  this.name = name || FILE_SYSTEM_NAME;
}
Memory.isSupported = function() {
  return true;
};

Memory.prototype.open = function(callback) {
  var result = createDB(this.name);
  this.db = result.db;
  asyncCallback(function() {
    callback(null, result.firstAccess);
  });
};
Memory.prototype.getReadOnlyContext = function() {
  return new MemoryContext(this.db, true);
};
Memory.prototype.getReadWriteContext = function() {
  return new MemoryContext(this.db, false);
};

module.exports = Memory;
