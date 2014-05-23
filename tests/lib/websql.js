(function(global) {

  var Filer = require('../..');

  var needsCleanup = [];
  if(global.addEventListener) {
    window.addEventListener('beforeunload', function() {
      needsCleanup.forEach(function(f) { f(); });
    });
  }

  function WebSQLTestProvider(name) {
    var _done = false;
    var that = this;

    function cleanup(callback) {
      if(!that.provider || _done) {
        return;
      }
      // Provider is there, but db was never touched
      if(!that.provider.db) {
        return;
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

  module.exports = WebSQLTestProvider;

}(this));
