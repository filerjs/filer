define(function(require) {

  // AES encryption, see http://code.google.com/p/crypto-js/#AES
  require("crypto-js/rollups/aes");
  // DES, Triple DES, see http://code.google.com/p/crypto-js/#DES,_Triple_DES
  require("crypto-js/rollups/tripledes");
  // Rabbit, see http://code.google.com/p/crypto-js/#Rabbi
  require("crypto-js/rollups/rabbit");


  function CryptoWrappedContext(context, encrypt, decrypt) {
    this.context = context;
    this.encrypt = encrypt;
    this.decrypt = decrypt;
  }
  CryptoWrappedContext.prototype.clear = function(callback) {
    this.context.clear(callback);
  };
  CryptoWrappedContext.prototype.get = function(key, callback) {
    var that = this;
    this.context.get(key, function(err, value) {
      if(err) {
        callback(err);
        return;
      }
      if(value) {
        value = that.decrypt(value);
      }
      callback(null, value);
    });
  };
  CryptoWrappedContext.prototype.put = function(key, value, callback) {
    var encryptedValue = this.encrypt(value);
    this.context.put(key, encryptedValue, callback);
  };
  CryptoWrappedContext.prototype.delete = function(key, callback) {
    this.context.delete(key, callback);
  };


  function buildCryptoWrapper(encryptionType) {
    // It is up to the app using this wrapper how the passphrase is acquired, probably by
    // prompting the user to enter it when the file system is being opened.
    function CryptoWrappedProvider(passphrase, provider) {
      this.provider = provider;
      this.encrypt = function(plain) {
        return CryptoJS[encryptionType].encrypt(plain, passphrase)
                                       .toString();
      };
      this.decrypt = function(encrypted) {
        return CryptoJS[encryptionType].decrypt(encrypted, passphrase)
                                       .toString(CryptoJS.enc.Utf8);
      };
    }
    CryptoWrappedProvider.isSupported = function() {
      return true;
    };

    CryptoWrappedProvider.prototype.open = function(callback) {
      this.provider.open(callback);
    };
    CryptoWrappedProvider.prototype.getReadOnlyContext = function() {
      return new CryptoWrappedContext(this.provider.getReadOnlyContext(),
                                      this.encrypt,
                                      this.decrypt);
    };
    CryptoWrappedProvider.prototype.getReadWriteContext = function() {
      return new CryptoWrappedContext(this.provider.getReadWriteContext(),
                                      this.encrypt,
                                      this.decrypt);
    };

    return CryptoWrappedProvider;
  }

  return {
    AESWrapper: buildCryptoWrapper('AES'),
    TripleDESWrapper: buildCryptoWrapper('TripleDES'),
    RabbitWrapper: buildCryptoWrapper('Rabbit')
  };
});
