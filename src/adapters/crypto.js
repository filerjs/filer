define(function(require) {

  // AES encryption, see http://code.google.com/p/crypto-js/#AES
  require("crypto-js/rollups/aes");
  // DES, Triple DES, see http://code.google.com/p/crypto-js/#DES,_Triple_DES
  require("crypto-js/rollups/tripledes");
  // Rabbit, see http://code.google.com/p/crypto-js/#Rabbit
  require("crypto-js/rollups/rabbit");

  // Move back and forth from Uint8Arrays and CryptoJS' WordArray
  // source: https://groups.google.com/forum/#!topic/crypto-js/TOb92tcJlU0
  var WordArray = CryptoJS.lib.WordArray;
  function fromWordArray(wordArray) {
    var words = wordArray.words;
    var sigBytes = wordArray.sigBytes;
    var u8 = new Uint8Array(sigBytes);
    for (var i = 0; i < sigBytes; i++) {
      var byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      u8[i]=byte;
    }
    return u8;
  }
  function toWordArray(u8arr) {
    var len = u8arr.length;
    var words = [];
    for (var i = 0; i < len; i++) {
      words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return WordArray.create(words, len);
  }

  CryptoJS.enc.Uint8Array = {
    stringify: fromWordArray,
    parse: toWordArray
  };

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
      this.encrypt = function(buffer) {
        var wordArray = toWordArray(buffer);
//        return CryptoJS[encryptionType]
//                 .encrypt(wordArray, passphrase)
//                 .toString(CryptoJS.enc.Uint8Array);

        var e = CryptoJS[encryptionType].encrypt(wordArray, passphrase);
        var e2 = e.ciphertext.toString(CryptoJS.enc.Uint8Array);
        console.log("encrypt", e, e2);
        return e2;
      };
      this.decrypt = function(encrypted) {
debugger;
        var wordArray = toWordArray(encrypted);
//        return CryptoJS[encryptionType]
//                 .decrypt(wordArray, passphrase)
//                 .toString(CryptoJS.enc.Uint8Array);

//     var cipherParams = CryptoJS.lib.CipherParams.create({
//                ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
//            });

        var result = CryptoJS[encryptionType].decrypt({ciphertext:wordArray}, passphrase);
        return result.toString(CryptoJS.enc.Uint8Array);
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
