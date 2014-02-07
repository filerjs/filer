define(function(require) {
  var FILE_SYSTEM_NAME = require('../constants').FILE_SYSTEM_NAME;

  function MemoryContext(db, readOnly) {
    this.readOnly = readOnly;
    this.objectStore = db;
  }
  MemoryContext.prototype.clear = function(callback) {
    if(this.readOnly) {
      return callback("[MemoryContext] Error: write operation on read only context");
    }
    var objectStore = this.objectStore;
    Object.keys(objectStore).forEach(function(key){
      delete objectStore[key];
    });
    callback(null);
  };
  MemoryContext.prototype.get = function(key, callback) {
    callback(null, this.objectStore[key]);
  };
  MemoryContext.prototype.put = function(key, value, callback) {
    if(this.readOnly) {
      return callback("[MemoryContext] Error: write operation on read only context");
    }
    this.objectStore[key] = value;
    callback(null);
  };
  MemoryContext.prototype.delete = function(key, callback) {
    if(this.readOnly) {
      return callback("[MemoryContext] Error: write operation on read only context");
    }
    delete this.objectStore[key];
    callback(null);
  };


  function Memory(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = {};
  }
  Memory.isSupported = function() {
    return true;
  };

  Memory.prototype.open = function(callback) {
    callback(null, true);
  };
  Memory.prototype.getReadOnlyContext = function() {
    return new MemoryContext(this.db, true);
  };
  Memory.prototype.getReadWriteContext = function() {
    return new MemoryContext(this.db, false);
  };

  return Memory;
});
