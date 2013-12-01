define(function(require) {

  // AES encryption, see http://code.google.com/p/crypto-js/#AES
  require("crypto-js/rollups/aes");
  // DES, Triple DES, see http://code.google.com/p/crypto-js/#DES,_Triple_DES
  require("crypto-js/rollups/tripledes");
  // Rabbit, see http://code.google.com/p/crypto-js/#Rabbit
  require("crypto-js/rollups/rabbit");


  function CryptoContext(context, encrypt, decrypt) {
    this.context = context;
    this.encrypt = encrypt;
    this.decrypt = decrypt;
  }
  CryptoContext.prototype.clear = function(callback) {
    this.context.clear(callback);
  };
  CryptoContext.prototype.get = function(key, callback) {
    var decrypt = this.decrypt;
    this.context.get(key, function(err, value) {
      if(err) {
        callback(err);
        return;
      }
      if(value) {
        value = decrypt(value);
      }
      callback(null, value);
    });
  };
  CryptoContext.prototype.put = function(key, value, callback) {
    var encryptedValue = this.encrypt(value);
    this.context.put(key, encryptedValue, callback);
  };
  CryptoContext.prototype.delete = function(key, callback) {
    this.context.delete(key, callback);
  };


  function buildCryptoAdapter(encryptionType) {
    // It is up to the app using this wrapper how the passphrase is acquired, probably by
    // prompting the user to enter it when the file system is being opened.
    function CryptoAdapter(passphrase, provider) {
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
    CryptoAdapter.isSupported = function() {
      return true;
    };

    CryptoAdapter.prototype.open = function(callback) {
      this.provider.open(callback);
    };
    CryptoAdapter.prototype.getReadOnlyContext = function() {
      return new CryptoContext(this.provider.getReadOnlyContext(),
                               this.encrypt,
                               this.decrypt);
    };
    CryptoAdapter.prototype.getReadWriteContext = function() {
      return new CryptoContext(this.provider.getReadWriteContext(),
                               this.encrypt,
                               this.decrypt);
    };

    return CryptoAdapter;
  }

  return {
    AES: buildCryptoAdapter('AES'),
    TripleDES: buildCryptoAdapter('TripleDES'),
    Rabbit: buildCryptoAdapter('Rabbit')
  };
});
