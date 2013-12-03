define(function(require) {

  // ZLib compression, see
  // https://github.com/imaya/zlib.js/blob/master/bin/zlib.min.js
  require("zlib");

  var Inflate = Zlib.Inflate;
  function inflate(compressed) {
    return (new Inflate(compressed)).decompress();
  }

  var Deflate = Zlib.Deflate;
  function deflate(buffer) {
    return (new Deflate(buffer)).compress();
  }

  function ZlibContext(context) {
    this.context = context;
  }
  ZlibContext.prototype.clear = function(callback) {
    this.context.clear(callback);
  };
  ZlibContext.prototype.get = function(key, callback) {
    this.context.get(key, function(err, result) {
      if(err) {
        callback(err);
        return;
      }
      // Deal with result being null
      if(result) {
        result = inflate(result);
      }
      callback(null, result);
    });
  };
  ZlibContext.prototype.put = function(key, value, callback) {
    value = deflate(value);
    this.context.put(key, value, callback);
  };
  ZlibContext.prototype.delete = function(key, callback) {
    this.context.delete(key, callback);
  };


  function ZlibAdapter(provider, inflate, deflate) {
      this.provider = provider;
  }
  ZlibAdapter.isSupported = function() {
    return true;
  };

  ZlibAdapter.prototype.open = function(callback) {
    this.provider.open(callback);
  };
  ZlibAdapter.prototype.getReadOnlyContext = function() {
    return new ZlibContext(this.provider.getReadOnlyContext());
  };
  ZlibAdapter.prototype.getReadWriteContext = function() {
    return new ZlibContext(this.provider.getReadWriteContext());
  };

  return ZlibAdapter;
});
