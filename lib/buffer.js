/*
Copyright (c) 2012, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

;(function(window, undefined) {
  'use strict';  

  /** Detect free variable `exports` */
  var freeExports = (typeof exports == 'object') && exports &&
    (typeof global == 'object' && global && global == global.global && (window = global)) ? exports : undefined;

  /**
   * [source]http://closure-library.googlecode.com/svn/docs/closure_goog_crypt_crypt.js.source.html
   * Converts a JS string to a UTF-8 "byte" array.
   * @param {string} str 16-bit unicode string.
   * @return {Array.<number>} UTF-8 byte array.
   */
  function stringToUtf8ByteArray(string, offset, length, buffer) {
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
  }


  /**
   * [source]http://closure-library.googlecode.com/svn/docs/closure_goog_crypt_crypt.js.source.html
   * Converts a UTF-8 byte array to JavaScript's 16-bit Unicode.
   * @param {Array.<number>} bytes UTF-8 byte array.
   * @return {string} 16-bit Unicode string.
   */
  function utf8ByteArrayToString(bytes) {
    // TODO(user): Use native implementations if/when available
    var out = [], pos = 0, c = 0;
    var c1, c2, c3;
    while (pos < bytes.length) {
      c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else {
        c2 = bytes[pos++];
        c3 = bytes[pos++];
        out[c++] = String.fromCharCode(
            (c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join('');
  }

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

  function BufferOverflowError(){ Error.apply(this, arguments); }
  BufferOverflowError.prototype = new Error();
  BufferOverflowError.prototype.name = "BufferOverflowError";
  BufferOverflowError.prototype.constructor = BufferOverflowError;

  function Buffer(arg, optArg) {
    this.__bytes__ = undefined;
    if(Array.isArray(arg) || isTypedArray(arg)) {
      this.__bytes__ = new Uint8Array(arg);
    } else if("string" === typeof arg) {
      // FIXME: support other encodings   
      this.__bytes__ = new Uint8Array(Buffer.byteLength(arg));      
      this.write(arg);
    } else if("number" === typeof arg) {
      this.__bytes__ = new Uint8Array(arg);
    } else {
      // Do nothing!
    }
    this.__dataview__ = new DataView(this.__bytes__.buffer);
  }
  Buffer.BufferOverflowError = BufferOverflowError;
  Buffer.isBuffer = function isBuffer(object) {
    return object instanceof Buffer;
  };
  Buffer.isSupportedEncoding = function isSupportedEncoding(encoding) {
    if("utf-8" === encoding) {
      return true;
    } else {
      return false;
    }
  };
  Buffer.byteLength = function byteLength(string, optEncoding) {
    // FIXME: support other encodings
    return window.unescape(encodeURIComponent(string)).length;
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
  Buffer.prototype.length = function length() {
    return this.__bytes__.length;
  };
  Buffer.prototype.bytes = function bytes() {
    return this.__bytes__;
  };
  Buffer.prototype.write = function write(string, optOffset, optLength, optEncoding) {
    // FIXME: support other encodings
    optOffset = (undefined === optOffset) ? 0 : optOffset;
    optLength = (undefined === optLength) ? Buffer.byteLength(string) : optLength;
    stringToUtf8ByteArray(string, optOffset, optLength, this.__bytes__);
  };
  Buffer.prototype.toString = function toString(optEncoding, optStart, optEnd) {
    // FIXME: support other encodings
    optStart = (undefined === optStart) ? 0 : optStart;
    optEnd = (undefined === optEnd) ? this.__bytes__.length : optEnd;      
    var source;
    if(optStart > 0 || optEnd < this.__bytes__.length) {
      source = this.__bytes__.subarray(optStart, optEnd);
    } else {
      source = this.__bytes__;
    }
    return utf8ByteArrayToString(source);
  };
  Buffer.prototype.copy = function copy(targetBuffer, optTargetStart, optSourceStart, optSourceEnd) {
    optTargetStart = (undefined === optTargetStart) ? 0 : optTargetStart;
    optSourceStart = (undefined === optSourceStart) ? 0 : optSourceStart;
    optSourceEnd = (undefined === optSourceEnd) ? this.__bytes__.length : optSourceEnd;
    var source;
    if(optSourceStart > 0 || optSourceEnd < this.__bytes__.length) {
      source = this.__bytes__.subarray(optSourceStart, optSourceEnd);
    } else {
      source = this.__bytes__;
    }
    targetBuffer.__bytes__.set(source, optTargetStart);
  };
  Buffer.prototype.slice = function slice(optStart, optEnd) {
    optStart = (undefined === optStart) ? 0 : optStart;
    optEnd = (undefined === optEnd) ? this.__bytes__.length : optEnd;
    var buffer = new Buffer(this.__bytes__.buffer);
    buffer.__bytes__ = buffer.__bytes__.subarray(optStart, optEnd);
    return buffer;
  };
  Buffer.prototype.readUInt8 = function readUInt8(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 1) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getUint8(offset);
  };
  Buffer.prototype.readInt8 = function readInt8(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 1) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getInt8(offset);
  };
  Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 1) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setUint8(offset, value);
  };
  Buffer.prototype.writeInt8 = function writeInt8(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 1) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.setInt8(offset, value);
  };
  Buffer.prototype.readUInt16BE = function readUInt16BE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getUint16(offset, false);
  };
  Buffer.prototype.readUInt16LE = function readUInt16LE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getUint16(offset, true);
  };
  Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setUint16(offset, value, false);
  };
  Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setUint16(offset, value, true);
  };
  Buffer.prototype.readInt16BE = function readInt16BE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getInt16(offset, false);
  };
  Buffer.prototype.readInt16LE = function readInt16LE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getInt16(offset, true);
  };
  Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setInt16(offset, value, false);
  };
  Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 2) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setInt16(offset, value, true);
  };
  Buffer.prototype.readUInt32BE = function readUInt32BE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }    
    return this.__dataview__.getUint32(offset, false);
  };
  Buffer.prototype.readUInt32LE = function readUInt32LE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getUint32(offset, true);
  };
  Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setUint32(offset, value, false);
  };
  Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setUint32(offset, value, true);
  };
  Buffer.prototype.readInt32BE = function readInt32BE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }    
    return this.__dataview__.getInt32(offset, false);
  };
  Buffer.prototype.readInt32LE = function readInt32LE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getInt32(offset, true);
  };
  Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setInt32(offset, value, false);
  };
  Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setInt32(offset, value, true);
  };
  Buffer.prototype.readFloatBE = function readFloatBE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getFloat32(offset, false);
  };
  Buffer.prototype.readFloatLE = function readFloatLE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getFloat32(offset, true);
  };
  Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setFloat32(offset, value, false);
  };
  Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setFloat32(offset, value, true);
  };
  Buffer.prototype.readDoubleBE = function readDoubleBE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getFloat64(offset, false);
  };
  Buffer.prototype.readDoubleLE = function readDoubleLE(offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    return this.__dataview__.getFloat64(offset, true);
  };
  Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setFloat64(offset, value, false);
  };
  Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, optNoAssert) {
    if(!optNoAssert && offset > this.__bytes__.length - 4) {
      throw new BufferOverflowError();
    }
    this.__dataview__.setFloat64(offset, value, true);
  };

/*--------------------------------------------------------------------------*/

  // expose the API (borrowed from Lodash: https://raw.github.com/bestiejs/lodash/v0.6.1/lodash.js)
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose api to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window.Buffer = Buffer;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return Buffer;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports) {    
    // in Node.js or RingoJS v0.8.0+
    if (typeof module == 'object' && module && module.exports == freeExports) {
      // FIXME: Hack for Node.js
      var unescape = require("querystring").unescape;
      (module.exports = Buffer).Buffer = Buffer;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports.B = Buffer;
    }
  }
  else {
    // in a browser or Rhino
    window.Buffer = Buffer;
  }
}(this));