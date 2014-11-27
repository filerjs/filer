var Filer = require("../..");

var indexedDB = global.indexedDB       ||
                global.mozIndexedDB    ||
                global.webkitIndexedDB ||
                global.msIndexedDB;

var needsCleanup = [];
if(global.addEventListener) {
  global.addEventListener('beforeunload', function() {
    needsCleanup.forEach(function(f) { f(); });
  });
}

function IndexedDBTestProvider(name) {
  var _done = false;
  var that = this;

  function cleanup(callback) {
    callback = callback || function(){};

    if(!that.provider || _done) {
      return callback();
    }

    // We have to force any other connections to close
    // before we can delete a db.
    if(that.provider.db) {
      that.provider.db.close();
    }

    var request = indexedDB.deleteDatabase(name);
    function finished() {
      that.provider = null;
      _done = true;
      callback();
    }
    request.onsuccess = finished;
    request.onerror = finished;
  }

  function init() {
    if(that.provider) {
      return;
    }
    that.provider = new Filer.FileSystem.providers.IndexedDB(name);
    needsCleanup.push(cleanup);
  }

  this.init = init;
  this.cleanup = cleanup;
}
IndexedDBTestProvider.isSupported = function() {
  return Filer.FileSystem.providers.IndexedDB.isSupported();
};

module.exports = IndexedDBTestProvider;
