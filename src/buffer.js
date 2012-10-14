/*
Copyright (c) 2012, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

define(function(require) {

  /**
   * http://closure-library.googlecode.com/svn/docs/closure_goog_crypt_crypt.js.source.html
   * Turns a string into an array of bytes; a "byte" being a JS number in the
   * range 0-255.
   * @param {string} str String value to arrify.
   * @return {Array.<number>} Array of numbers corresponding to the
   *     UCS character codes of each character in str.
   */
  var stringToByteArray = function(string, buffer) {
    var p = 0;
    for (var i = 0; i < string.length; i++) {
      var c = string.charCodeAt(i);
      while (c > 0xff) {
        buffer[p++] = c & 0xff;
        c >>= 8;
      }
      buffer[p++] = c;
    }
    return buffer;
  };

  /**
   * http://closure-library.googlecode.com/svn/docs/closure_goog_crypt_crypt.js.source.html
   * Turns an array of numbers into the string given by the concatenation of the
   * characters to which the numbers correspond.
   * @param {Array} array Array of numbers representing characters.
   * @return {string} Stringification of the array.
   */
  var byteArrayToString = function(array) {
    return String.fromCharCode.apply(null, array);
  };

  /**
   * http://closure-library.googlecode.com/svn/docs/closure_goog_crypt_crypt.js.source.html
   * Converts a JS string to a UTF-8 "byte" array.
   * @param {string} str 16-bit unicode string.
   * @return {Array.<number>} UTF-8 byte array.
   */
  stringToUtf8ByteArray = function(string, offset, length, buffer) {
    // TODO(user): Use native implementations if/when available
    string = string.replace(/\r\n/g, '\n');
    var p = 0;
    for (var i = offset; i < string.length && p < length; i++) {
      var c = string.charCodeAt(i);
      if (c < 128) {
        buffer[p++] = c;
      } else if (c < 2048) {
        buffer[p++] = (c >> 6) | 192;
        buffer[p++] = (c & 63) | 128;
      } else {
        buffer[p++] = (c >> 12) | 224;
        buffer[p++] = ((c >> 6) & 63) | 128;
        buffer[p++] = (c & 63) | 128;
      }
    }
    return buffer;
  };


  /**
   * http://closure-library.googlecode.com/svn/docs/closure_goog_crypt_crypt.js.source.html
   * Converts a UTF-8 byte array to JavaScript's 16-bit Unicode.
   * @param {Array.<number>} bytes UTF-8 byte array.
   * @return {string} 16-bit Unicode string.
   */
  utf8ByteArrayToString = function(bytes) {
    // TODO(user): Use native implementations if/when available
    var out = [], pos = 0, c = 0;
    while (pos < bytes.length) {
      var c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        var c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else {
        var c2 = bytes[pos++];
        var c3 = bytes[pos++];
        out[c++] = String.fromCharCode(
            (c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join('');
  };

  function isTypedArray(object) {
    return object instanceof ArrayBuffer ||
           object instanceof Int8Array ||
           object instanceof Uint8Array ||
           object instanceof Int16Array ||
           object instanceof Uint16Array ||
           object instanceof Int32Array ||
           object instanceof Uint32Array ||
           object instanceof Float32Array ||
           object instanceof Float64Array;
  }

  function Buffer(arg, optArg) {
    this.__buffer__;
    if(Array.isArray(arg) || isTypedArray(arg)) {
      this.__buffer__ = new Uint8Array(arg);
    } else if("string" === typeof arg) {
      // FIXME: parse optArg to see if we should use non-default encoding      
      this.__buffer__ = new Uint8Array(Buffer.byteLength(arg));      
      this.write(arg);
    } else if("number" === typeof arg) {
      this.__buffer__ = new Uint8Array(arg);
    } else {
      // Do nothing!
    }
  }
  Buffer.isBuffer = function isBuffer(object) {
    return object instanceof Buffer;
  };
  Buffer.byteLength = function byteLength(string, optEncoding) {
    return unescape(encodeURIComponent(string)).length;
  };
  Buffer.concat = function concat(list, optTotalLength) {
    var i, l;
    if(undefined === optTotalLength) {
      optTotalLength = 0;
      for(i = 0, l = list.length; i < l; ++ i) {
        optTotalLength += list[i].length();
      }
    }
    var target = new Buffer(optTotalLength);
    var offset = 0;
    for(i = 0, l = list.length; i < l; ++ i) {
      var source = list[i];
      source.copy(target, offset);
      offset += source.length();
    }
    return target;
  };
  Buffer.prototype.get = function get(offset) {
    return this.__buffer__[offset];
  };
  Buffer.prototype.set = function set(offset, value) {
    this.__buffer__[offset] = value;
    return value;
  };
  Buffer.prototype.length = function length() {
    return this.__buffer__.length;
  };
  Buffer.prototype.write = function write(string, optOffset, optLength, optEncoding) {
    optOffset = (undefined === optOffset) ? 0 : optOffset;
    optLength = (undefined === optLength) ? Buffer.byteLength(string) : optLength;
    stringToUtf8ByteArray(string, optOffset, optLength, this.__buffer__);
  };
  Buffer.prototype.toString = function toString(optEncoding, optStart, optEnd) {
    optStart = (undefined === optStart) ? 0 : optStart;
    optEnd = (undefined === optEnd) ? this.__buffer__.length : optEnd;      
    var source;
    if(optStart > 0 || optEnd < this.__buffer__.length) {
      source = this.__buffer__.subarray(optStart, optEnd);
    } else {
      source = this.__buffer__;
    }
    return utf8ByteArrayToString(source);
  };
  Buffer.prototype.copy = function copy(targetBuffer, optTargetStart, optSourceStart, optSourceEnd) {
    optTargetStart = (undefined === optTargetStart) ? 0 : optTargetStart;
    optSourceStart = (undefined === optSourceStart) ? 0 : optSourceStart;
    optSourceEnd = (undefined === optSourceEnd) ? this.__buffer__.length : optSourceEnd;
    var source;
    if(optSourceStart > 0 || optSourceEnd < this.__buffer__.length) {
      source = this.__buffer__.subarray(optSourceStart, optSourceEnd);
    } else {
      source = this.__buffer__;
    }
    console.log(source);
    targetBuffer.__buffer__.set(source, optTargetStart);
  };
  Buffer.prototype.slice = function slice(optStart, optEnd) {
    var bufferSlice = new Buffer();
    bufferSlice.__buffer__ = this.__buffer__.subarray(optStart, optEnd);
  };

  return Buffer;

});