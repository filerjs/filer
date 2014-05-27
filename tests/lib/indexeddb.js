(function(global) {
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
      if(!that.provider || _done) {
        return;
      }

      // We have to force any other connections to close
      // before we can delete a db.
      if(that.provider.db) {
        that.provider.db.close();
      }

      callback = callback || function(){};
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

  module.exports = IndexedDBTestProvider;

}(this));
