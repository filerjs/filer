var Filer = require('../../src');

var needsCleanup = [];
if(global.addEventListener) {
  global.addEventListener('beforeunload', function() {
    needsCleanup.forEach(function(f) { f(); });
  });
}

function WebSQLTestProvider(name) {
  var _done = false;
  var that = this;

  function cleanup(callback) {
    callback = callback || function(){};

    if(!that.provider || _done) {
      return callback();
    }

    // Provider is there, but db was never touched
    if(!that.provider.db) {
      return callback();
    }

    var context = that.provider.getReadWriteContext();
    context.clear(function() {
      that.provider = null;
      _done = true;
      callback();
    });
  }

  function init() {
    if(that.provider) {
      return;
    }
    that.provider = new Filer.FileSystem.providers.WebSQL(name);
    needsCleanup.push(cleanup);
  }

  this.init = init;
  this.cleanup = cleanup;
}
WebSQLTestProvider.isSupported = function() {
  return Filer.FileSystem.providers.WebSQL.isSupported();
};

module.exports = WebSQLTestProvider;
