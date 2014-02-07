define(function(require) {

  return {
    Compression: require('./zlib'),
    Encryption: require('./crypto')
  };

});
