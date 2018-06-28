var Filer = require('../../src');

function MemoryTestProvider(name) {
  var that = this;

  function cleanup(callback) {
    callback = callback || function(){};

    that.provider = null;
    callback();
  }

  function init() {
    if(that.provider) {
      return;
    }
    that.provider = new Filer.FileSystem.providers.Memory(name);
  }

  this.init = init;
  this.cleanup = cleanup;
}
MemoryTestProvider.isSupported = function() {
  return Filer.FileSystem.providers.Memory.isSupported();
};

module.exports = MemoryTestProvider;
