define(function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;

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

  // Custom formatting for encryption objects <-> strings
  var formatter = {
    stringify: function(cipherParams) {
      // create json object with ciphertext
      var jsonObj = {
        ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
      };

      // cache iv and salt
      if (cipherParams.iv) {
        jsonObj.iv = cipherParams.iv.toString();
      }
      if (cipherParams.salt) {
        jsonObj.s = cipherParams.salt.toString();
      }

      // stringify json object
      return JSON.stringify(jsonObj);
    },

    parse: function(jsonString) {
      // parse json string
      var jsonObj;
      try {
        jsonObj = JSON.parse(jsonString);
      } catch(e) {
        throw e;
      }

      // extract ciphertext from json object, and create cipher params object
      var cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
      });

      // extract iv and salt
      if (jsonObj.iv) {
        cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
      }
      if (jsonObj.s) {
        cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
      }

      return cipherParams;
    }
  };

  function buildCryptoWrapper(encryptionType) {
    // It is up to the app using this wrapper how the passphrase is acquired, probably by
    // prompting the user to enter it when the file system is being opened.
    function CryptoWrappedProvider(passphrase, provider) {
      this.provider = provider;
      this.encrypt = function(plain) {
        console.log('encrypt', plain, CryptoJS[encryptionType].encrypt(plain, passphrase).toString());
        return CryptoJS[encryptionType].encrypt(plain, passphrase, {format: formatter}).toString();
      };
      this.decrypt = function(encrypted) {
        console.log('decrypt', encrypted, CryptoJS[encryptionType].decrypt(encrypted, passphrase).toString());
        return CryptoJS[encryptionType].decrypt(encrypted, passphrase, {format: formatter}).toString();
      };
    }
    CryptoWrappedProvider.isSupported = function() {
      return true;
    };

    CryptoWrappedProvider.prototype.open = function(callback) {
      this.provider.open(callback);
    };
    CryptoWrappedProvider.prototype.getReadOnlyContext = function() {
      return new CryptoWrappedContext(this.provider.getReadOnlyContext(), this.encrypt, this.decrypt);
    };
    CryptoWrappedProvider.prototype.getReadWriteContext = function() {
      return new CryptoWrappedContext(this.provider.getReadWriteContext(), this.encrypt, this.decrypt);
    };

    return CryptoWrappedProvider;
  }

  return {
    AESWrapper: buildCryptoWrapper('AES'),
    TripleDESWrapper: buildCryptoWrapper('TripleDES'),
    RabbitWrapper: buildCryptoWrapper('Rabbit')
  };
});
