define(function(require) {

  return {
    Compression: require('src/adapters/zlib'),
    Encryption: require('src/adapters/crypto')
  };

});
