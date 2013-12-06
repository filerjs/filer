define(function(require) {

  // AES encryption, see http://code.google.com/p/crypto-js/#AES
  require("crypto-js/rollups/aes");
  // DES, Triple DES, see http://code.google.com/p/crypto-js/#DES,_Triple_DES
  require("crypto-js/rollups/tripledes");
  // Rabbit, see http://code.google.com/p/crypto-js/#Rabbit
  require("crypto-js/rollups/rabbit");


  // Move back and forth from Uint8Arrays and CryptoJS WordArray
  // See http://code.google.com/p/crypto-js/#The_Cipher_Input and
  // https://groups.google.com/forum/#!topic/crypto-js/TOb92tcJlU0
  var WordArray = CryptoJS.lib.WordArray;
  function fromWordArray(wordArray) {
    var words = wordArray.words;
    var sigBytes = wordArray.sigBytes;
    var u8 = new Uint8Array(sigBytes);
    var b;
    for (var i = 0; i < sigBytes; i++) {
      b = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      u8[i] = b;
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


  // UTF8 Text De/Encoders
  require('encoding');
  function encode(str) {
    return (new TextEncoder('utf-8')).encode(str);
  }
  function decode(u8arr) {
    return (new TextDecoder('utf-8')).decode(u8arr);
  }


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

      // Cache cipher algorithm we'll use in encrypt/decrypt
      var cipher = CryptoJS[encryptionType];

      // To encrypt:
      //   1) accept a buffer (Uint8Array) containing binary data
      //   2) convert the buffer to a CipherJS WordArray
      //   3) encrypt the WordArray using the chosen cipher algorithm + passphrase
      //   4) convert the resulting ciphertext to a UTF8 encoded Uint8Array and return
      this.encrypt = function(buffer) {
        var wordArray = toWordArray(buffer);
        var encrypted = cipher.encrypt(wordArray, passphrase);
        var utf8EncodedBuf = encode(encrypted);
        return utf8EncodedBuf;
      };

      // To decrypt:
      //   1) accept a buffer (Uint8Array) containing a UTF8 encoded Uint8Array
      //   2) convert the buffer to string (i.e., the ciphertext we got from encrypting)
      //   3) decrypt the ciphertext string
      //   4) convert the decrypted cipherParam object to a UTF8 string
      //   5) encode the UTF8 string to a Uint8Array buffer and return
      this.decrypt = function(buffer) {
        var encryptedStr = decode(buffer);
        var decrypted = cipher.decrypt(encryptedStr, passphrase);
        var decryptedUtf8 = decrypted.toString(CryptoJS.enc.Utf8);
        var utf8EncodedBuf = encode(decryptedUtf8);
        return utf8EncodedBuf;
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
