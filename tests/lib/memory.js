define(["Filer"], function(Filer) {

  function MemoryTestProvider(name) {
    var that = this;

    function cleanup(callback) {
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

  return MemoryTestProvider;

});
