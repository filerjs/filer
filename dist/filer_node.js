/*
Copyright (c) 2013, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function( root, factory ) {
  if (typeof exports === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define( factory );
  }
}( this, function() {
// Cherry-picked bits of underscore.js, lodash.js

/**
 * Lo-Dash 2.4.0 <http://lodash.com/>
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

define('nodash',['require'],function(require) {

  var ArrayProto = Array.prototype;
  var nativeForEach = ArrayProto.forEach;
  var nativeIndexOf = ArrayProto.indexOf;
  var nativeSome = ArrayProto.some;

  var ObjProto = Object.prototype;
  var hasOwnProperty = ObjProto.hasOwnProperty;
  var nativeKeys = Object.keys;

  var breaker = {};

  function has(obj, key) {
    return hasOwnProperty.call(obj, key);
  }

  var keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (has(obj, key)) keys.push(key);
    return keys;
  };

  function size(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : keys(obj).length;
  }

  function identity(value) {
    return value;
  }

  function each(obj, iterator, context) {
    var i, length;
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  function any(obj, iterator, context) {
    iterator || (iterator = identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  function contains(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  function Wrapped(value) {
    this.value = value;
  }
  Wrapped.prototype.has = function(key) {
    return has(this.value, key);
  };
  Wrapped.prototype.contains = function(target) {
    return contains(this.value, target);
  };
  Wrapped.prototype.size = function() {
    return size(this.value);
  };

  function nodash(value) {
    // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
    return (value && typeof value == 'object' && !Array.isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
      ? value
      : new Wrapped(value);
  }

  return nodash;

});

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Based on https://github.com/joyent/node/blob/41e53e557992a7d552a8e23de035f9463da25c99/lib/path.js
define('src/path',[],function() {

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes, empty elements, or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up--; up) {
        parts.unshift('..');
      }
    }

    return parts;
  }

  // Split a filename into [root, dir, basename, ext], unix version
  // 'root' is just a slash, or nothing.
  var splitPathRe =
        /^(\/?)([\s\S]+\/(?!$)|\/)?((?:\.{1,2}$|[\s\S]+?)?(\.[^.\/]*)?)$/;
  var splitPath = function(filename) {
    var result = splitPathRe.exec(filename);
    return [result[1] || '', result[2] || '', result[3] || '', result[4] || ''];
  };

  // path.resolve([from ...], to)
  function resolve() {
    var resolvedPath = '',
        resolvedAbsolute = false;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      // XXXidbfs: we don't have process.cwd() so we use '/' as a fallback
      var path = (i >= 0) ? arguments[i] : '/';

      // Skip empty and invalid entries
      if (typeof path !== 'string' || !path) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charAt(0) === '/';
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(resolvedPath.split('/').filter(function(p) {
      return !!p;
    }), !resolvedAbsolute).join('/');

    return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
  }

  // path.normalize(path)
  function normalize(path) {
    var isAbsolute = path.charAt(0) === '/',
        trailingSlash = path.substr(-1) === '/';

    // Normalize the path
    path = normalizeArray(path.split('/').filter(function(p) {
      return !!p;
    }), !isAbsolute).join('/');

    if (!path && !isAbsolute) {
      path = '.';
    }
    /*
    if (path && trailingSlash) {
      path += '/';
    }
    */

    return (isAbsolute ? '/' : '') + path;
  }

  function join() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return normalize(paths.filter(function(p, index) {
      return p && typeof p === 'string';
    }).join('/'));
  }

  // path.relative(from, to)
  function relative(from, to) {
    from = exports.resolve(from).substr(1);
    to = exports.resolve(to).substr(1);

    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== '') break;
      }

      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== '') break;
      }

      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }

    var fromParts = trim(from.split('/'));
    var toParts = trim(to.split('/'));

    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..');
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join('/');
  }

  function dirname(path) {
    var result = splitPath(path),
        root = result[0],
        dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return '.';
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  }

  function basename(path, ext) {
    var f = splitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    // XXXidbfs: node.js just does `return f`
    return f === "" ? "/" : f;
  }

  function extname(path) {
    return splitPath(path)[3];
  }

  function isAbsolute(path) {
    if(path.charAt(0) === '/') {
      return true;
    }
    return false;
  }

  function isNull(path) {
    if (('' + path).indexOf('\u0000') !== -1) {
      return true;
    }
    return false;
  }

  // XXXidbfs: we don't support path.exists() or path.existsSync(), which
  // are deprecated, and need a FileSystem instance to work. Use fs.stat().

  return {
    normalize: normalize,
    resolve: resolve,
    join: join,
    relative: relative,
    sep: '/',
    delimiter: ':',
    dirname: dirname,
    basename: basename,
    extname: extname,
    isAbsolute: isAbsolute,
    isNull: isNull
  };

});

/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(i,p){var f={},q=f.lib={},j=q.Base=function(){function a(){}return{extend:function(h){a.prototype=this;var d=new a;h&&d.mixIn(h);d.$super=this;return d},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var d in a)a.hasOwnProperty(d)&&(this[d]=a[d]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.$super.extend(this)}}}(),k=q.WordArray=j.extend({init:function(a,h){a=
this.words=a||[];this.sigBytes=h!=p?h:4*a.length},toString:function(a){return(a||m).stringify(this)},concat:function(a){var h=this.words,d=a.words,c=this.sigBytes,a=a.sigBytes;this.clamp();if(c%4)for(var b=0;b<a;b++)h[c+b>>>2]|=(d[b>>>2]>>>24-8*(b%4)&255)<<24-8*((c+b)%4);else if(65535<d.length)for(b=0;b<a;b+=4)h[c+b>>>2]=d[b>>>2];else h.push.apply(h,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<32-8*(b%4);a.length=i.ceil(b/4)},clone:function(){var a=
j.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],d=0;d<a;d+=4)b.push(4294967296*i.random()|0);return k.create(b,a)}}),r=f.enc={},m=r.Hex={stringify:function(a){for(var b=a.words,a=a.sigBytes,d=[],c=0;c<a;c++){var e=b[c>>>2]>>>24-8*(c%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c+=2)d[c>>>3]|=parseInt(a.substr(c,2),16)<<24-4*(c%8);return k.create(d,b/2)}},s=r.Latin1={stringify:function(a){for(var b=
a.words,a=a.sigBytes,d=[],c=0;c<a;c++)d.push(String.fromCharCode(b[c>>>2]>>>24-8*(c%4)&255));return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c++)d[c>>>2]|=(a.charCodeAt(c)&255)<<24-8*(c%4);return k.create(d,b)}},g=r.Utf8={stringify:function(a){try{return decodeURIComponent(escape(s.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return s.parse(unescape(encodeURIComponent(a)))}},b=q.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=k.create();
this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=g.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,d=b.words,c=b.sigBytes,e=this.blockSize,f=c/(4*e),f=a?i.ceil(f):i.max((f|0)-this._minBufferSize,0),a=f*e,c=i.min(4*a,c);if(a){for(var g=0;g<a;g+=e)this._doProcessBlock(d,g);g=d.splice(0,a);b.sigBytes-=c}return k.create(g,c)},clone:function(){var a=j.clone.call(this);a._data=this._data.clone();return a},_minBufferSize:0});q.Hasher=b.extend({init:function(){this.reset()},
reset:function(){b.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);this._doFinalize();return this._hash},clone:function(){var a=b.clone.call(this);a._hash=this._hash.clone();return a},blockSize:16,_createHelper:function(a){return function(b,d){return a.create(d).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return e.HMAC.create(a,d).finalize(b)}}});var e=f.algo={};return f}(Math);
(function(i){var p=CryptoJS,f=p.lib,q=f.WordArray,f=f.Hasher,j=p.algo,k=[],r=[];(function(){function f(a){for(var b=i.sqrt(a),d=2;d<=b;d++)if(!(a%d))return!1;return!0}function g(a){return 4294967296*(a-(a|0))|0}for(var b=2,e=0;64>e;)f(b)&&(8>e&&(k[e]=g(i.pow(b,0.5))),r[e]=g(i.pow(b,1/3)),e++),b++})();var m=[],j=j.SHA256=f.extend({_doReset:function(){this._hash=q.create(k.slice(0))},_doProcessBlock:function(f,g){for(var b=this._hash.words,e=b[0],a=b[1],h=b[2],d=b[3],c=b[4],i=b[5],j=b[6],k=b[7],l=0;64>
l;l++){if(16>l)m[l]=f[g+l]|0;else{var n=m[l-15],o=m[l-2];m[l]=((n<<25|n>>>7)^(n<<14|n>>>18)^n>>>3)+m[l-7]+((o<<15|o>>>17)^(o<<13|o>>>19)^o>>>10)+m[l-16]}n=k+((c<<26|c>>>6)^(c<<21|c>>>11)^(c<<7|c>>>25))+(c&i^~c&j)+r[l]+m[l];o=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&a^e&h^a&h);k=j;j=i;i=c;c=d+n|0;d=h;h=a;a=e;e=n+o|0}b[0]=b[0]+e|0;b[1]=b[1]+a|0;b[2]=b[2]+h|0;b[3]=b[3]+d|0;b[4]=b[4]+c|0;b[5]=b[5]+i|0;b[6]=b[6]+j|0;b[7]=b[7]+k|0},_doFinalize:function(){var f=this._data,g=f.words,b=8*this._nDataBytes,
e=8*f.sigBytes;g[e>>>5]|=128<<24-e%32;g[(e+64>>>9<<4)+15]=b;f.sigBytes=4*g.length;this._process()}});p.SHA256=f._createHelper(j);p.HmacSHA256=f._createHmacHelper(j)})(Math);

define("crypto-js/rollups/sha256", function(){});

define('src/shared',['require','crypto-js/rollups/sha256'],function(require) {

  require("crypto-js/rollups/sha256"); var Crypto = CryptoJS;

  function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  function hash(string) {
    return Crypto.SHA256(string).toString(Crypto.enc.hex);
  }

  function nop() {}

  /**
   * Convert a Uint8Array to a regular array
   */
  function u8toArray(u8) {
    var array = [];
    var len = u8.length;
    for(var i = 0; i < len; i++) {
      array[i] = u8[i];
    }
    return array;
  }

  return {
    guid: guid,
    hash: hash,
    u8toArray: u8toArray,
    nop: nop
  };

});

define('src/constants',['require'],function(require) {

  var O_READ = 'READ';
  var O_WRITE = 'WRITE';
  var O_CREATE = 'CREATE';
  var O_EXCLUSIVE = 'EXCLUSIVE';
  var O_TRUNCATE = 'TRUNCATE';
  var O_APPEND = 'APPEND';
  var XATTR_CREATE = 'CREATE';
  var XATTR_REPLACE = 'REPLACE';

  return {
    FILE_SYSTEM_NAME: 'local',

    FILE_STORE_NAME: 'files',

    IDB_RO: 'readonly',
    IDB_RW: 'readwrite',

    WSQL_VERSION: "1",
    WSQL_SIZE: 5 * 1024 * 1024,
    WSQL_DESC: "FileSystem Storage",

    MODE_FILE: 'FILE',
    MODE_DIRECTORY: 'DIRECTORY',
    MODE_SYMBOLIC_LINK: 'SYMLINK',
    MODE_META: 'META',

    SYMLOOP_MAX: 10,

    BINARY_MIME_TYPE: 'application/octet-stream',
    JSON_MIME_TYPE: 'application/json',

    ROOT_DIRECTORY_NAME: '/', // basename(normalize(path))

    // FS Mount Flags
    FS_FORMAT: 'FORMAT',
    FS_NOCTIME: 'NOCTIME',
    FS_NOMTIME: 'NOMTIME',

    // FS File Open Flags
    O_READ: O_READ,
    O_WRITE: O_WRITE,
    O_CREATE: O_CREATE,
    O_EXCLUSIVE: O_EXCLUSIVE,
    O_TRUNCATE: O_TRUNCATE,
    O_APPEND: O_APPEND,

    O_FLAGS: {
      'r': [O_READ],
      'r+': [O_READ, O_WRITE],
      'w': [O_WRITE, O_CREATE, O_TRUNCATE],
      'w+': [O_WRITE, O_READ, O_CREATE, O_TRUNCATE],
      'wx': [O_WRITE, O_CREATE, O_EXCLUSIVE, O_TRUNCATE],
      'wx+': [O_WRITE, O_READ, O_CREATE, O_EXCLUSIVE, O_TRUNCATE],
      'a': [O_WRITE, O_CREATE, O_APPEND],
      'a+': [O_WRITE, O_READ, O_CREATE, O_APPEND],
      'ax': [O_WRITE, O_CREATE, O_EXCLUSIVE, O_APPEND],
      'ax+': [O_WRITE, O_READ, O_CREATE, O_EXCLUSIVE, O_APPEND]
    },

    XATTR_CREATE: XATTR_CREATE,
    XATTR_REPLACE: XATTR_REPLACE,

    FS_READY: 'READY',
    FS_PENDING: 'PENDING',
    FS_ERROR: 'ERROR',

    SUPER_NODE_ID: '00000000-0000-0000-0000-000000000000',

    ENVIRONMENT: {
      TMP: '/tmp',
      PATH: ''
    }
  };

});
define('src/errors',['require'],function(require) {
  var errors = {};
  [
    /**
     * node.js errors
     */
    '-1:UNKNOWN:unknown error',
    '0:OK:success',
    '1:EOF:end of file',
    '2:EADDRINFO:getaddrinfo error',
    '3:EACCES:permission denied',
    '4:EAGAIN:resource temporarily unavailable',
    '5:EADDRINUSE:address already in use',
    '6:EADDRNOTAVAIL:address not available',
    '7:EAFNOSUPPORT:address family not supported',
    '8:EALREADY:connection already in progress',
    '9:EBADF:bad file descriptor',
    '10:EBUSY:resource busy or locked',
    '11:ECONNABORTED:software caused connection abort',
    '12:ECONNREFUSED:connection refused',
    '13:ECONNRESET:connection reset by peer',
    '14:EDESTADDRREQ:destination address required',
    '15:EFAULT:bad address in system call argument',
    '16:EHOSTUNREACH:host is unreachable',
    '17:EINTR:interrupted system call',
    '18:EINVAL:invalid argument',
    '19:EISCONN:socket is already connected',
    '20:EMFILE:too many open files',
    '21:EMSGSIZE:message too long',
    '22:ENETDOWN:network is down',
    '23:ENETUNREACH:network is unreachable',
    '24:ENFILE:file table overflow',
    '25:ENOBUFS:no buffer space available',
    '26:ENOMEM:not enough memory',
    '27:ENOTDIR:not a directory',
    '28:EISDIR:illegal operation on a directory',
    '29:ENONET:machine is not on the network',
    // errno 30 skipped, as per https://github.com/rvagg/node-errno/blob/master/errno.js
    '31:ENOTCONN:socket is not connected',
    '32:ENOTSOCK:socket operation on non-socket',
    '33:ENOTSUP:operation not supported on socket',
    '34:ENOENT:no such file or directory',
    '35:ENOSYS:function not implemented',
    '36:EPIPE:broken pipe',
    '37:EPROTO:protocol error',
    '38:EPROTONOSUPPORT:protocol not supported',
    '39:EPROTOTYPE:protocol wrong type for socket',
    '40:ETIMEDOUT:connection timed out',
    '41:ECHARSET:invalid Unicode character',
    '42:EAIFAMNOSUPPORT:address family for hostname not supported',
    // errno 43 skipped, as per https://github.com/rvagg/node-errno/blob/master/errno.js
    '44:EAISERVICE:servname not supported for ai_socktype',
    '45:EAISOCKTYPE:ai_socktype not supported',
    '46:ESHUTDOWN:cannot send after transport endpoint shutdown',
    '47:EEXIST:file already exists',
    '48:ESRCH:no such process',
    '49:ENAMETOOLONG:name too long',
    '50:EPERM:operation not permitted',
    '51:ELOOP:too many symbolic links encountered',
    '52:EXDEV:cross-device link not permitted',
    '53:ENOTEMPTY:directory not empty',
    '54:ENOSPC:no space left on device',
    '55:EIO:i/o error',
    '56:EROFS:read-only file system',
    '57:ENODEV:no such device',
    '58:ESPIPE:invalid seek',
    '59:ECANCELED:operation canceled',

    /**
     * Filer specific errors
     */
    '1000:ENOTMOUNTED:not mounted',
    '1001:EFILESYSTEMERROR:missing super node, use \'FORMAT\' flag to format filesystem.',
    '1002:ENOATTR:attribute does not exist'
  ].forEach(function(e) {
    e = e.split(':');
    var errno = e[0],
        err = e[1],
        message = e[2];

    function ctor(m) {
      this.message = m || message;
    }
    var proto = ctor.prototype = new Error();
    proto.errno = errno;
    proto.code = err;
    proto.constructor = ctor;

    // We expose the error as both Errors.EINVAL and Errors[18]
    errors[err] = errors[errno] = ctor;
  });

  return errors;
});

define('src/providers/indexeddb',['require','src/constants','src/constants','src/constants','src/constants','src/errors'],function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;

  var indexedDB = (function(window) {
    return window.indexedDB       ||
           window.mozIndexedDB    ||
           window.webkitIndexedDB ||
           window.msIndexedDB;
  }(this));

  var IDB_RW = require('src/constants').IDB_RW;
  var IDB_RO = require('src/constants').IDB_RO;
  var Errors = require('src/errors');

  function IndexedDBContext(db, mode) {
    var transaction = db.transaction(FILE_STORE_NAME, mode);
    this.objectStore = transaction.objectStore(FILE_STORE_NAME);
  }
  IndexedDBContext.prototype.clear = function(callback) {
    try {
      var request = this.objectStore.clear();
      request.onsuccess = function(event) {
        callback();
      };
      request.onerror = function(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };
  IndexedDBContext.prototype.get = function(key, callback) {
    try {
      var request = this.objectStore.get(key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(null, result);
      };
      request.onerror = function onerror(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };
  IndexedDBContext.prototype.put = function(key, value, callback) {
    try {
      var request = this.objectStore.put(value, key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(null, result);
      };
      request.onerror = function onerror(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };
  IndexedDBContext.prototype.delete = function(key, callback) {
    try {
      var request = this.objectStore.delete(key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(null, result);
      };
      request.onerror = function(error) {
        callback(error);
      };
    } catch(e) {
      callback(e);
    }
  };


  function IndexedDB(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = null;
  }
  IndexedDB.isSupported = function() {
    return !!indexedDB;
  };

  IndexedDB.prototype.open = function(callback) {
    var that = this;

    // Bail if we already have a db open
    if( that.db ) {
      callback(null, false);
      return;
    }

    // Keep track of whether we're accessing this db for the first time
    // and therefore needs to get formatted.
    var firstAccess = false;

    // NOTE: we're not using versioned databases.
    var openRequest = indexedDB.open(that.name);

    // If the db doesn't exist, we'll create it
    openRequest.onupgradeneeded = function onupgradeneeded(event) {
      var db = event.target.result;

      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      db.createObjectStore(FILE_STORE_NAME);

      firstAccess = true;
    };

    openRequest.onsuccess = function onsuccess(event) {
      that.db = event.target.result;
      callback(null, firstAccess);
    };
    openRequest.onerror = function onerror(error) {
      callback(new Errors.EINVAL('IndexedDB cannot be accessed. If private browsing is enabled, disable it.'));
    };
  };
  IndexedDB.prototype.getReadOnlyContext = function() {
    // Due to timing issues in Chrome with readwrite vs. readonly indexeddb transactions
    // always use readwrite so we can make sure pending commits finish before callbacks.
    // See https://github.com/js-platform/filer/issues/128
    return new IndexedDBContext(this.db, IDB_RW);
  };
  IndexedDB.prototype.getReadWriteContext = function() {
    return new IndexedDBContext(this.db, IDB_RW);
  };

  return IndexedDB;
});

define('src/providers/websql',['require','src/constants','src/constants','src/constants','src/constants','src/constants','src/shared','src/errors'],function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;
  var WSQL_VERSION = require('src/constants').WSQL_VERSION;
  var WSQL_SIZE = require('src/constants').WSQL_SIZE;
  var WSQL_DESC = require('src/constants').WSQL_DESC;
  var u8toArray = require('src/shared').u8toArray;
  var Errors = require('src/errors');

  function WebSQLContext(db, isReadOnly) {
    var that = this;
    this.getTransaction = function(callback) {
      if(that.transaction) {
        callback(that.transaction);
        return;
      }
      // Either do readTransaction() (read-only) or transaction() (read/write)
      db[isReadOnly ? 'readTransaction' : 'transaction'](function(transaction) {
        that.transaction = transaction;
        callback(transaction);
      });
    };
  }
  WebSQLContext.prototype.clear = function(callback) {
    function onError(transaction, error) {
      callback(error);
    }
    function onSuccess(transaction, result) {
      callback(null);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("DELETE FROM " + FILE_STORE_NAME + ";",
                             [], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.get = function(key, callback) {
    function onSuccess(transaction, result) {
      // If the key isn't found, return null
      var value = result.rows.length === 0 ? null : result.rows.item(0).data;
      try {
        if(value) {
          value = JSON.parse(value);
          // Deal with special-cased flattened typed arrays in WebSQL (see put() below)
          if(value.__isUint8Array) {
            value = new Uint8Array(value.__array);
          }
        }
        callback(null, value);
      } catch(e) {
        callback(e);
      }
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("SELECT data FROM " + FILE_STORE_NAME + " WHERE id = ?;",
                             [key], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.put = function(key, value, callback) {
    // We do extra work to make sure typed arrays survive
    // being stored in the db and still get the right prototype later.
    if(Object.prototype.toString.call(value) === "[object Uint8Array]") {
      value = {
        __isUint8Array: true,
        __array: u8toArray(value)
      };
    }
    value = JSON.stringify(value);
    function onSuccess(transaction, result) {
      callback(null);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("INSERT OR REPLACE INTO " + FILE_STORE_NAME + " (id, data) VALUES (?, ?);",
                             [key, value], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.delete = function(key, callback) {
    function onSuccess(transaction, result) {
      callback(null);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("DELETE FROM " + FILE_STORE_NAME + " WHERE id = ?;",
                             [key], onSuccess, onError);
    });
  };


  function WebSQL(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = null;
  }
  WebSQL.isSupported = function() {
    return typeof window === 'undefined' ? false : !!window.openDatabase;
  };

  WebSQL.prototype.open = function(callback) {
    var that = this;

    // Bail if we already have a db open
    if(that.db) {
      callback(null, false);
      return;
    }

    var db = window.openDatabase(that.name, WSQL_VERSION, WSQL_DESC, WSQL_SIZE);
    if(!db) {
      callback("[WebSQL] Unable to open database.");
      return;
    }

    function onError(transaction, error) {
      if (error.code === 5) {
        callback(new Errors.EINVAL('WebSQL cannot be accessed. If private browsing is enabled, disable it.'));
      }
      callback(error);
    }
    function onSuccess(transaction, result) {
      that.db = db;

      function gotCount(transaction, result) {
        var firstAccess = result.rows.item(0).count === 0;
        callback(null, firstAccess);
      }
      function onError(transaction, error) {
        callback(error);
      }
      // Keep track of whether we're accessing this db for the first time
      // and therefore needs to get formatted.
      transaction.executeSql("SELECT COUNT(id) AS count FROM " + FILE_STORE_NAME + ";",
                             [], gotCount, onError);
    }

    // Create the table and index we'll need to store the fs data.
    db.transaction(function(transaction) {
      function createIndex(transaction) {
        transaction.executeSql("CREATE INDEX IF NOT EXISTS idx_" + FILE_STORE_NAME + "_id" +
                               " on " + FILE_STORE_NAME + " (id);",
                               [], onSuccess, onError);
      }
      transaction.executeSql("CREATE TABLE IF NOT EXISTS " + FILE_STORE_NAME + " (id unique, data TEXT);",
                             [], createIndex, onError);
    });
  };
  WebSQL.prototype.getReadOnlyContext = function() {
    return new WebSQLContext(this.db, true);
  };
  WebSQL.prototype.getReadWriteContext = function() {
    return new WebSQLContext(this.db, false);
  };

  return WebSQL;
});

/*global setImmediate: false, setTimeout: false, console: false */

/**
 * https://raw.github.com/caolan/async/master/lib/async.js Feb 18, 2014
 * Used under MIT - https://github.com/caolan/async/blob/master/LICENSE
 */

(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define('async',[], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

define('src/providers/memory',['require','src/constants','async'],function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;

  var asyncCallback = require('async').nextTick;

  function MemoryContext(db, readOnly) {
    this.readOnly = readOnly;
    this.objectStore = db;
  }
  MemoryContext.prototype.clear = function(callback) {
    if(this.readOnly) {
      asyncCallback(function() {
        callback("[MemoryContext] Error: write operation on read only context");
      });
      return;
    }
    var objectStore = this.objectStore;
    Object.keys(objectStore).forEach(function(key){
      delete objectStore[key];
    });
    asyncCallback(callback);
  };
  MemoryContext.prototype.get = function(key, callback) {
    var that = this;
    asyncCallback(function() {
      callback(null, that.objectStore[key]);
    });
  };
  MemoryContext.prototype.put = function(key, value, callback) {
    if(this.readOnly) {
      asyncCallback(function() {
        callback("[MemoryContext] Error: write operation on read only context");
      });
      return;
    }
    this.objectStore[key] = value;
    asyncCallback(callback);
  };
  MemoryContext.prototype.delete = function(key, callback) {
    if(this.readOnly) {
      asyncCallback(function() {
        callback("[MemoryContext] Error: write operation on read only context");
      });
      return;
    }
    delete this.objectStore[key];
    asyncCallback(callback);
  };


  function Memory(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = {};
  }
  Memory.isSupported = function() {
    return true;
  };

  Memory.prototype.open = function(callback) {
    asyncCallback(function() {
      callback(null, true);
    });
  };
  Memory.prototype.getReadOnlyContext = function() {
    return new MemoryContext(this.db, true);
  };
  Memory.prototype.getReadWriteContext = function() {
    return new MemoryContext(this.db, false);
  };

  return Memory;
});

define('src/providers/providers',['require','src/providers/indexeddb','src/providers/websql','src/providers/memory'],function(require) {

  var IndexedDB = require('src/providers/indexeddb');
  var WebSQL = require('src/providers/websql');
  var Memory = require('src/providers/memory');

  return {
    IndexedDB: IndexedDB,
    WebSQL: WebSQL,
    Memory: Memory,

    /**
     * Convenience Provider references
     */

    // The default provider to use when none is specified
    Default: IndexedDB,

    // The Fallback provider does automatic fallback checks
    Fallback: (function() {
      if(IndexedDB.isSupported()) {
        return IndexedDB;
      }

      if(WebSQL.isSupported()) {
        return WebSQL;
      }

      function NotSupported() {
        throw "[Filer Error] Your browser doesn't support IndexedDB or WebSQL.";
      }
      NotSupported.isSupported = function() {
        return false;
      };
      return NotSupported;
    }())
  };
});

/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {function l(d){throw d;}var u=void 0,x=!0,aa=this;function z(d,a){var c=d.split("."),f=aa;!(c[0]in f)&&f.execScript&&f.execScript("var "+c[0]);for(var b;c.length&&(b=c.shift());)!c.length&&a!==u?f[b]=a:f=f[b]?f[b]:f[b]={}};var E="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array;function G(d,a){this.index="number"===typeof a?a:0;this.i=0;this.buffer=d instanceof(E?Uint8Array:Array)?d:new (E?Uint8Array:Array)(32768);2*this.buffer.length<=this.index&&l(Error("invalid index"));this.buffer.length<=this.index&&this.f()}G.prototype.f=function(){var d=this.buffer,a,c=d.length,f=new (E?Uint8Array:Array)(c<<1);if(E)f.set(d);else for(a=0;a<c;++a)f[a]=d[a];return this.buffer=f};
G.prototype.d=function(d,a,c){var f=this.buffer,b=this.index,e=this.i,g=f[b],h;c&&1<a&&(d=8<a?(N[d&255]<<24|N[d>>>8&255]<<16|N[d>>>16&255]<<8|N[d>>>24&255])>>32-a:N[d]>>8-a);if(8>a+e)g=g<<a|d,e+=a;else for(h=0;h<a;++h)g=g<<1|d>>a-h-1&1,8===++e&&(e=0,f[b++]=N[g],g=0,b===f.length&&(f=this.f()));f[b]=g;this.buffer=f;this.i=e;this.index=b};G.prototype.finish=function(){var d=this.buffer,a=this.index,c;0<this.i&&(d[a]<<=8-this.i,d[a]=N[d[a]],a++);E?c=d.subarray(0,a):(d.length=a,c=d);return c};
var fa=new (E?Uint8Array:Array)(256),O;for(O=0;256>O;++O){for(var P=O,Q=P,ga=7,P=P>>>1;P;P>>>=1)Q<<=1,Q|=P&1,--ga;fa[O]=(Q<<ga&255)>>>0}var N=fa;function ha(d){this.buffer=new (E?Uint16Array:Array)(2*d);this.length=0}ha.prototype.getParent=function(d){return 2*((d-2)/4|0)};ha.prototype.push=function(d,a){var c,f,b=this.buffer,e;c=this.length;b[this.length++]=a;for(b[this.length++]=d;0<c;)if(f=this.getParent(c),b[c]>b[f])e=b[c],b[c]=b[f],b[f]=e,e=b[c+1],b[c+1]=b[f+1],b[f+1]=e,c=f;else break;return this.length};
ha.prototype.pop=function(){var d,a,c=this.buffer,f,b,e;a=c[0];d=c[1];this.length-=2;c[0]=c[this.length];c[1]=c[this.length+1];for(e=0;;){b=2*e+2;if(b>=this.length)break;b+2<this.length&&c[b+2]>c[b]&&(b+=2);if(c[b]>c[e])f=c[e],c[e]=c[b],c[b]=f,f=c[e+1],c[e+1]=c[b+1],c[b+1]=f;else break;e=b}return{index:d,value:a,length:this.length}};function R(d){var a=d.length,c=0,f=Number.POSITIVE_INFINITY,b,e,g,h,k,n,q,r,p;for(r=0;r<a;++r)d[r]>c&&(c=d[r]),d[r]<f&&(f=d[r]);b=1<<c;e=new (E?Uint32Array:Array)(b);g=1;h=0;for(k=2;g<=c;){for(r=0;r<a;++r)if(d[r]===g){n=0;q=h;for(p=0;p<g;++p)n=n<<1|q&1,q>>=1;for(p=n;p<b;p+=k)e[p]=g<<16|r;++h}++g;h<<=1;k<<=1}return[e,c,f]};function ia(d,a){this.h=ma;this.w=0;this.input=E&&d instanceof Array?new Uint8Array(d):d;this.b=0;a&&(a.lazy&&(this.w=a.lazy),"number"===typeof a.compressionType&&(this.h=a.compressionType),a.outputBuffer&&(this.a=E&&a.outputBuffer instanceof Array?new Uint8Array(a.outputBuffer):a.outputBuffer),"number"===typeof a.outputIndex&&(this.b=a.outputIndex));this.a||(this.a=new (E?Uint8Array:Array)(32768))}var ma=2,na={NONE:0,r:1,k:ma,N:3},oa=[],S;
for(S=0;288>S;S++)switch(x){case 143>=S:oa.push([S+48,8]);break;case 255>=S:oa.push([S-144+400,9]);break;case 279>=S:oa.push([S-256+0,7]);break;case 287>=S:oa.push([S-280+192,8]);break;default:l("invalid literal: "+S)}
ia.prototype.j=function(){var d,a,c,f,b=this.input;switch(this.h){case 0:c=0;for(f=b.length;c<f;){a=E?b.subarray(c,c+65535):b.slice(c,c+65535);c+=a.length;var e=a,g=c===f,h=u,k=u,n=u,q=u,r=u,p=this.a,m=this.b;if(E){for(p=new Uint8Array(this.a.buffer);p.length<=m+e.length+5;)p=new Uint8Array(p.length<<1);p.set(this.a)}h=g?1:0;p[m++]=h|0;k=e.length;n=~k+65536&65535;p[m++]=k&255;p[m++]=k>>>8&255;p[m++]=n&255;p[m++]=n>>>8&255;if(E)p.set(e,m),m+=e.length,p=p.subarray(0,m);else{q=0;for(r=e.length;q<r;++q)p[m++]=
e[q];p.length=m}this.b=m;this.a=p}break;case 1:var s=new G(E?new Uint8Array(this.a.buffer):this.a,this.b);s.d(1,1,x);s.d(1,2,x);var w=pa(this,b),y,ja,B;y=0;for(ja=w.length;y<ja;y++)if(B=w[y],G.prototype.d.apply(s,oa[B]),256<B)s.d(w[++y],w[++y],x),s.d(w[++y],5),s.d(w[++y],w[++y],x);else if(256===B)break;this.a=s.finish();this.b=this.a.length;break;case ma:var D=new G(E?new Uint8Array(this.a.buffer):this.a,this.b),Da,M,U,V,W,gb=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],ba,Ea,ca,Fa,ka,ra=Array(19),
Ga,X,la,A,Ha;Da=ma;D.d(1,1,x);D.d(Da,2,x);M=pa(this,b);ba=qa(this.L,15);Ea=sa(ba);ca=qa(this.K,7);Fa=sa(ca);for(U=286;257<U&&0===ba[U-1];U--);for(V=30;1<V&&0===ca[V-1];V--);var Ia=U,Ja=V,I=new (E?Uint32Array:Array)(Ia+Ja),t,J,v,da,H=new (E?Uint32Array:Array)(316),F,C,K=new (E?Uint8Array:Array)(19);for(t=J=0;t<Ia;t++)I[J++]=ba[t];for(t=0;t<Ja;t++)I[J++]=ca[t];if(!E){t=0;for(da=K.length;t<da;++t)K[t]=0}t=F=0;for(da=I.length;t<da;t+=J){for(J=1;t+J<da&&I[t+J]===I[t];++J);v=J;if(0===I[t])if(3>v)for(;0<
v--;)H[F++]=0,K[0]++;else for(;0<v;)C=138>v?v:138,C>v-3&&C<v&&(C=v-3),10>=C?(H[F++]=17,H[F++]=C-3,K[17]++):(H[F++]=18,H[F++]=C-11,K[18]++),v-=C;else if(H[F++]=I[t],K[I[t]]++,v--,3>v)for(;0<v--;)H[F++]=I[t],K[I[t]]++;else for(;0<v;)C=6>v?v:6,C>v-3&&C<v&&(C=v-3),H[F++]=16,H[F++]=C-3,K[16]++,v-=C}d=E?H.subarray(0,F):H.slice(0,F);ka=qa(K,7);for(A=0;19>A;A++)ra[A]=ka[gb[A]];for(W=19;4<W&&0===ra[W-1];W--);Ga=sa(ka);D.d(U-257,5,x);D.d(V-1,5,x);D.d(W-4,4,x);for(A=0;A<W;A++)D.d(ra[A],3,x);A=0;for(Ha=d.length;A<
Ha;A++)if(X=d[A],D.d(Ga[X],ka[X],x),16<=X){A++;switch(X){case 16:la=2;break;case 17:la=3;break;case 18:la=7;break;default:l("invalid code: "+X)}D.d(d[A],la,x)}var Ka=[Ea,ba],La=[Fa,ca],L,Ma,ea,ua,Na,Oa,Pa,Qa;Na=Ka[0];Oa=Ka[1];Pa=La[0];Qa=La[1];L=0;for(Ma=M.length;L<Ma;++L)if(ea=M[L],D.d(Na[ea],Oa[ea],x),256<ea)D.d(M[++L],M[++L],x),ua=M[++L],D.d(Pa[ua],Qa[ua],x),D.d(M[++L],M[++L],x);else if(256===ea)break;this.a=D.finish();this.b=this.a.length;break;default:l("invalid compression type")}return this.a};
function ta(d,a){this.length=d;this.G=a}
var va=function(){function d(b){switch(x){case 3===b:return[257,b-3,0];case 4===b:return[258,b-4,0];case 5===b:return[259,b-5,0];case 6===b:return[260,b-6,0];case 7===b:return[261,b-7,0];case 8===b:return[262,b-8,0];case 9===b:return[263,b-9,0];case 10===b:return[264,b-10,0];case 12>=b:return[265,b-11,1];case 14>=b:return[266,b-13,1];case 16>=b:return[267,b-15,1];case 18>=b:return[268,b-17,1];case 22>=b:return[269,b-19,2];case 26>=b:return[270,b-23,2];case 30>=b:return[271,b-27,2];case 34>=b:return[272,
b-31,2];case 42>=b:return[273,b-35,3];case 50>=b:return[274,b-43,3];case 58>=b:return[275,b-51,3];case 66>=b:return[276,b-59,3];case 82>=b:return[277,b-67,4];case 98>=b:return[278,b-83,4];case 114>=b:return[279,b-99,4];case 130>=b:return[280,b-115,4];case 162>=b:return[281,b-131,5];case 194>=b:return[282,b-163,5];case 226>=b:return[283,b-195,5];case 257>=b:return[284,b-227,5];case 258===b:return[285,b-258,0];default:l("invalid length: "+b)}}var a=[],c,f;for(c=3;258>=c;c++)f=d(c),a[c]=f[2]<<24|f[1]<<
16|f[0];return a}(),wa=E?new Uint32Array(va):va;
function pa(d,a){function c(b,c){var a=b.G,d=[],e=0,f;f=wa[b.length];d[e++]=f&65535;d[e++]=f>>16&255;d[e++]=f>>24;var g;switch(x){case 1===a:g=[0,a-1,0];break;case 2===a:g=[1,a-2,0];break;case 3===a:g=[2,a-3,0];break;case 4===a:g=[3,a-4,0];break;case 6>=a:g=[4,a-5,1];break;case 8>=a:g=[5,a-7,1];break;case 12>=a:g=[6,a-9,2];break;case 16>=a:g=[7,a-13,2];break;case 24>=a:g=[8,a-17,3];break;case 32>=a:g=[9,a-25,3];break;case 48>=a:g=[10,a-33,4];break;case 64>=a:g=[11,a-49,4];break;case 96>=a:g=[12,a-
65,5];break;case 128>=a:g=[13,a-97,5];break;case 192>=a:g=[14,a-129,6];break;case 256>=a:g=[15,a-193,6];break;case 384>=a:g=[16,a-257,7];break;case 512>=a:g=[17,a-385,7];break;case 768>=a:g=[18,a-513,8];break;case 1024>=a:g=[19,a-769,8];break;case 1536>=a:g=[20,a-1025,9];break;case 2048>=a:g=[21,a-1537,9];break;case 3072>=a:g=[22,a-2049,10];break;case 4096>=a:g=[23,a-3073,10];break;case 6144>=a:g=[24,a-4097,11];break;case 8192>=a:g=[25,a-6145,11];break;case 12288>=a:g=[26,a-8193,12];break;case 16384>=
a:g=[27,a-12289,12];break;case 24576>=a:g=[28,a-16385,13];break;case 32768>=a:g=[29,a-24577,13];break;default:l("invalid distance")}f=g;d[e++]=f[0];d[e++]=f[1];d[e++]=f[2];var h,k;h=0;for(k=d.length;h<k;++h)p[m++]=d[h];w[d[0]]++;y[d[3]]++;s=b.length+c-1;r=null}var f,b,e,g,h,k={},n,q,r,p=E?new Uint16Array(2*a.length):[],m=0,s=0,w=new (E?Uint32Array:Array)(286),y=new (E?Uint32Array:Array)(30),ja=d.w,B;if(!E){for(e=0;285>=e;)w[e++]=0;for(e=0;29>=e;)y[e++]=0}w[256]=1;f=0;for(b=a.length;f<b;++f){e=h=0;
for(g=3;e<g&&f+e!==b;++e)h=h<<8|a[f+e];k[h]===u&&(k[h]=[]);n=k[h];if(!(0<s--)){for(;0<n.length&&32768<f-n[0];)n.shift();if(f+3>=b){r&&c(r,-1);e=0;for(g=b-f;e<g;++e)B=a[f+e],p[m++]=B,++w[B];break}0<n.length?(q=xa(a,f,n),r?r.length<q.length?(B=a[f-1],p[m++]=B,++w[B],c(q,0)):c(r,-1):q.length<ja?r=q:c(q,0)):r?c(r,-1):(B=a[f],p[m++]=B,++w[B])}n.push(f)}p[m++]=256;w[256]++;d.L=w;d.K=y;return E?p.subarray(0,m):p}
function xa(d,a,c){var f,b,e=0,g,h,k,n,q=d.length;h=0;n=c.length;a:for(;h<n;h++){f=c[n-h-1];g=3;if(3<e){for(k=e;3<k;k--)if(d[f+k-1]!==d[a+k-1])continue a;g=e}for(;258>g&&a+g<q&&d[f+g]===d[a+g];)++g;g>e&&(b=f,e=g);if(258===g)break}return new ta(e,a-b)}
function qa(d,a){var c=d.length,f=new ha(572),b=new (E?Uint8Array:Array)(c),e,g,h,k,n;if(!E)for(k=0;k<c;k++)b[k]=0;for(k=0;k<c;++k)0<d[k]&&f.push(k,d[k]);e=Array(f.length/2);g=new (E?Uint32Array:Array)(f.length/2);if(1===e.length)return b[f.pop().index]=1,b;k=0;for(n=f.length/2;k<n;++k)e[k]=f.pop(),g[k]=e[k].value;h=ya(g,g.length,a);k=0;for(n=e.length;k<n;++k)b[e[k].index]=h[k];return b}
function ya(d,a,c){function f(b){var c=k[b][n[b]];c===a?(f(b+1),f(b+1)):--g[c];++n[b]}var b=new (E?Uint16Array:Array)(c),e=new (E?Uint8Array:Array)(c),g=new (E?Uint8Array:Array)(a),h=Array(c),k=Array(c),n=Array(c),q=(1<<c)-a,r=1<<c-1,p,m,s,w,y;b[c-1]=a;for(m=0;m<c;++m)q<r?e[m]=0:(e[m]=1,q-=r),q<<=1,b[c-2-m]=(b[c-1-m]/2|0)+a;b[0]=e[0];h[0]=Array(b[0]);k[0]=Array(b[0]);for(m=1;m<c;++m)b[m]>2*b[m-1]+e[m]&&(b[m]=2*b[m-1]+e[m]),h[m]=Array(b[m]),k[m]=Array(b[m]);for(p=0;p<a;++p)g[p]=c;for(s=0;s<b[c-1];++s)h[c-
1][s]=d[s],k[c-1][s]=s;for(p=0;p<c;++p)n[p]=0;1===e[c-1]&&(--g[0],++n[c-1]);for(m=c-2;0<=m;--m){w=p=0;y=n[m+1];for(s=0;s<b[m];s++)w=h[m+1][y]+h[m+1][y+1],w>d[p]?(h[m][s]=w,k[m][s]=a,y+=2):(h[m][s]=d[p],k[m][s]=p,++p);n[m]=0;1===e[m]&&f(m)}return g}
function sa(d){var a=new (E?Uint16Array:Array)(d.length),c=[],f=[],b=0,e,g,h,k;e=0;for(g=d.length;e<g;e++)c[d[e]]=(c[d[e]]|0)+1;e=1;for(g=16;e<=g;e++)f[e]=b,b+=c[e]|0,b<<=1;e=0;for(g=d.length;e<g;e++){b=f[d[e]];f[d[e]]+=1;h=a[e]=0;for(k=d[e];h<k;h++)a[e]=a[e]<<1|b&1,b>>>=1}return a};function T(d,a){this.l=[];this.m=32768;this.e=this.g=this.c=this.q=0;this.input=E?new Uint8Array(d):d;this.s=!1;this.n=za;this.B=!1;if(a||!(a={}))a.index&&(this.c=a.index),a.bufferSize&&(this.m=a.bufferSize),a.bufferType&&(this.n=a.bufferType),a.resize&&(this.B=a.resize);switch(this.n){case Aa:this.b=32768;this.a=new (E?Uint8Array:Array)(32768+this.m+258);break;case za:this.b=0;this.a=new (E?Uint8Array:Array)(this.m);this.f=this.J;this.t=this.H;this.o=this.I;break;default:l(Error("invalid inflate mode"))}}
var Aa=0,za=1,Ba={D:Aa,C:za};
T.prototype.p=function(){for(;!this.s;){var d=Y(this,3);d&1&&(this.s=x);d>>>=1;switch(d){case 0:var a=this.input,c=this.c,f=this.a,b=this.b,e=u,g=u,h=u,k=f.length,n=u;this.e=this.g=0;e=a[c++];e===u&&l(Error("invalid uncompressed block header: LEN (first byte)"));g=e;e=a[c++];e===u&&l(Error("invalid uncompressed block header: LEN (second byte)"));g|=e<<8;e=a[c++];e===u&&l(Error("invalid uncompressed block header: NLEN (first byte)"));h=e;e=a[c++];e===u&&l(Error("invalid uncompressed block header: NLEN (second byte)"));h|=
e<<8;g===~h&&l(Error("invalid uncompressed block header: length verify"));c+g>a.length&&l(Error("input buffer is broken"));switch(this.n){case Aa:for(;b+g>f.length;){n=k-b;g-=n;if(E)f.set(a.subarray(c,c+n),b),b+=n,c+=n;else for(;n--;)f[b++]=a[c++];this.b=b;f=this.f();b=this.b}break;case za:for(;b+g>f.length;)f=this.f({v:2});break;default:l(Error("invalid inflate mode"))}if(E)f.set(a.subarray(c,c+g),b),b+=g,c+=g;else for(;g--;)f[b++]=a[c++];this.c=c;this.b=b;this.a=f;break;case 1:this.o(Ca,Ra);break;
case 2:Sa(this);break;default:l(Error("unknown BTYPE: "+d))}}return this.t()};
var Ta=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],Ua=E?new Uint16Array(Ta):Ta,Va=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],Wa=E?new Uint16Array(Va):Va,Xa=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],Ya=E?new Uint8Array(Xa):Xa,Za=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],$a=E?new Uint16Array(Za):Za,ab=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,
10,11,11,12,12,13,13],bb=E?new Uint8Array(ab):ab,cb=new (E?Uint8Array:Array)(288),Z,db;Z=0;for(db=cb.length;Z<db;++Z)cb[Z]=143>=Z?8:255>=Z?9:279>=Z?7:8;var Ca=R(cb),eb=new (E?Uint8Array:Array)(30),fb,hb;fb=0;for(hb=eb.length;fb<hb;++fb)eb[fb]=5;var Ra=R(eb);function Y(d,a){for(var c=d.g,f=d.e,b=d.input,e=d.c,g;f<a;)g=b[e++],g===u&&l(Error("input buffer is broken")),c|=g<<f,f+=8;g=c&(1<<a)-1;d.g=c>>>a;d.e=f-a;d.c=e;return g}
function ib(d,a){for(var c=d.g,f=d.e,b=d.input,e=d.c,g=a[0],h=a[1],k,n,q;f<h;){k=b[e++];if(k===u)break;c|=k<<f;f+=8}n=g[c&(1<<h)-1];q=n>>>16;d.g=c>>q;d.e=f-q;d.c=e;return n&65535}
function Sa(d){function a(a,b,c){var d,f,e,g;for(g=0;g<a;)switch(d=ib(this,b),d){case 16:for(e=3+Y(this,2);e--;)c[g++]=f;break;case 17:for(e=3+Y(this,3);e--;)c[g++]=0;f=0;break;case 18:for(e=11+Y(this,7);e--;)c[g++]=0;f=0;break;default:f=c[g++]=d}return c}var c=Y(d,5)+257,f=Y(d,5)+1,b=Y(d,4)+4,e=new (E?Uint8Array:Array)(Ua.length),g,h,k,n;for(n=0;n<b;++n)e[Ua[n]]=Y(d,3);g=R(e);h=new (E?Uint8Array:Array)(c);k=new (E?Uint8Array:Array)(f);d.o(R(a.call(d,c,g,h)),R(a.call(d,f,g,k)))}
T.prototype.o=function(d,a){var c=this.a,f=this.b;this.u=d;for(var b=c.length-258,e,g,h,k;256!==(e=ib(this,d));)if(256>e)f>=b&&(this.b=f,c=this.f(),f=this.b),c[f++]=e;else{g=e-257;k=Wa[g];0<Ya[g]&&(k+=Y(this,Ya[g]));e=ib(this,a);h=$a[e];0<bb[e]&&(h+=Y(this,bb[e]));f>=b&&(this.b=f,c=this.f(),f=this.b);for(;k--;)c[f]=c[f++-h]}for(;8<=this.e;)this.e-=8,this.c--;this.b=f};
T.prototype.I=function(d,a){var c=this.a,f=this.b;this.u=d;for(var b=c.length,e,g,h,k;256!==(e=ib(this,d));)if(256>e)f>=b&&(c=this.f(),b=c.length),c[f++]=e;else{g=e-257;k=Wa[g];0<Ya[g]&&(k+=Y(this,Ya[g]));e=ib(this,a);h=$a[e];0<bb[e]&&(h+=Y(this,bb[e]));f+k>b&&(c=this.f(),b=c.length);for(;k--;)c[f]=c[f++-h]}for(;8<=this.e;)this.e-=8,this.c--;this.b=f};
T.prototype.f=function(){var d=new (E?Uint8Array:Array)(this.b-32768),a=this.b-32768,c,f,b=this.a;if(E)d.set(b.subarray(32768,d.length));else{c=0;for(f=d.length;c<f;++c)d[c]=b[c+32768]}this.l.push(d);this.q+=d.length;if(E)b.set(b.subarray(a,a+32768));else for(c=0;32768>c;++c)b[c]=b[a+c];this.b=32768;return b};
T.prototype.J=function(d){var a,c=this.input.length/this.c+1|0,f,b,e,g=this.input,h=this.a;d&&("number"===typeof d.v&&(c=d.v),"number"===typeof d.F&&(c+=d.F));2>c?(f=(g.length-this.c)/this.u[2],e=258*(f/2)|0,b=e<h.length?h.length+e:h.length<<1):b=h.length*c;E?(a=new Uint8Array(b),a.set(h)):a=h;return this.a=a};
T.prototype.t=function(){var d=0,a=this.a,c=this.l,f,b=new (E?Uint8Array:Array)(this.q+(this.b-32768)),e,g,h,k;if(0===c.length)return E?this.a.subarray(32768,this.b):this.a.slice(32768,this.b);e=0;for(g=c.length;e<g;++e){f=c[e];h=0;for(k=f.length;h<k;++h)b[d++]=f[h]}e=32768;for(g=this.b;e<g;++e)b[d++]=a[e];this.l=[];return this.buffer=b};
T.prototype.H=function(){var d,a=this.b;E?this.B?(d=new Uint8Array(a),d.set(this.a.subarray(0,a))):d=this.a.subarray(0,a):(this.a.length>a&&(this.a.length=a),d=this.a);return this.buffer=d};function jb(d){if("string"===typeof d){var a=d.split(""),c,f;c=0;for(f=a.length;c<f;c++)a[c]=(a[c].charCodeAt(0)&255)>>>0;d=a}for(var b=1,e=0,g=d.length,h,k=0;0<g;){h=1024<g?1024:g;g-=h;do b+=d[k++],e+=b;while(--h);b%=65521;e%=65521}return(e<<16|b)>>>0};function kb(d,a){var c,f;this.input=d;this.c=0;if(a||!(a={}))a.index&&(this.c=a.index),a.verify&&(this.M=a.verify);c=d[this.c++];f=d[this.c++];switch(c&15){case lb:this.method=lb;break;default:l(Error("unsupported compression method"))}0!==((c<<8)+f)%31&&l(Error("invalid fcheck flag:"+((c<<8)+f)%31));f&32&&l(Error("fdict flag is not supported"));this.A=new T(d,{index:this.c,bufferSize:a.bufferSize,bufferType:a.bufferType,resize:a.resize})}
kb.prototype.p=function(){var d=this.input,a,c;a=this.A.p();this.c=this.A.c;this.M&&(c=(d[this.c++]<<24|d[this.c++]<<16|d[this.c++]<<8|d[this.c++])>>>0,c!==jb(a)&&l(Error("invalid adler-32 checksum")));return a};var lb=8;function mb(d,a){this.input=d;this.a=new (E?Uint8Array:Array)(32768);this.h=$.k;var c={},f;if((a||!(a={}))&&"number"===typeof a.compressionType)this.h=a.compressionType;for(f in a)c[f]=a[f];c.outputBuffer=this.a;this.z=new ia(this.input,c)}var $=na;
mb.prototype.j=function(){var d,a,c,f,b,e,g,h=0;g=this.a;d=lb;switch(d){case lb:a=Math.LOG2E*Math.log(32768)-8;break;default:l(Error("invalid compression method"))}c=a<<4|d;g[h++]=c;switch(d){case lb:switch(this.h){case $.NONE:b=0;break;case $.r:b=1;break;case $.k:b=2;break;default:l(Error("unsupported compression type"))}break;default:l(Error("invalid compression method"))}f=b<<6|0;g[h++]=f|31-(256*c+f)%31;e=jb(this.input);this.z.b=h;g=this.z.j();h=g.length;E&&(g=new Uint8Array(g.buffer),g.length<=
h+4&&(this.a=new Uint8Array(g.length+4),this.a.set(g),g=this.a),g=g.subarray(0,h+4));g[h++]=e>>24&255;g[h++]=e>>16&255;g[h++]=e>>8&255;g[h++]=e&255;return g};function nb(d,a){var c,f,b,e;if(Object.keys)c=Object.keys(a);else for(f in c=[],b=0,a)c[b++]=f;b=0;for(e=c.length;b<e;++b)f=c[b],z(d+"."+f,a[f])};z("Zlib.Inflate",kb);z("Zlib.Inflate.prototype.decompress",kb.prototype.p);nb("Zlib.Inflate.BufferType",{ADAPTIVE:Ba.C,BLOCK:Ba.D});z("Zlib.Deflate",mb);z("Zlib.Deflate.compress",function(d,a){return(new mb(d,a)).j()});z("Zlib.Deflate.prototype.compress",mb.prototype.j);nb("Zlib.Deflate.CompressionType",{NONE:$.NONE,FIXED:$.r,DYNAMIC:$.k});}).call(this);

define("zlib", function(){});

define('src/adapters/zlib',['require','zlib'],function(require) {

  // Zlib compression, see
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

/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(p,h){var i={},l=i.lib={},r=l.Base=function(){function a(){}return{extend:function(e){a.prototype=this;var c=new a;e&&c.mixIn(e);c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.$super.extend(this)}}}(),o=l.WordArray=r.extend({init:function(a,e){a=
this.words=a||[];this.sigBytes=e!=h?e:4*a.length},toString:function(a){return(a||s).stringify(this)},concat:function(a){var e=this.words,c=a.words,b=this.sigBytes,a=a.sigBytes;this.clamp();if(b%4)for(var d=0;d<a;d++)e[b+d>>>2]|=(c[d>>>2]>>>24-8*(d%4)&255)<<24-8*((b+d)%4);else if(65535<c.length)for(d=0;d<a;d+=4)e[b+d>>>2]=c[d>>>2];else e.push.apply(e,c);this.sigBytes+=a;return this},clamp:function(){var a=this.words,e=this.sigBytes;a[e>>>2]&=4294967295<<32-8*(e%4);a.length=p.ceil(e/4)},clone:function(){var a=
r.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var e=[],c=0;c<a;c+=4)e.push(4294967296*p.random()|0);return o.create(e,a)}}),m=i.enc={},s=m.Hex={stringify:function(a){for(var e=a.words,a=a.sigBytes,c=[],b=0;b<a;b++){var d=e[b>>>2]>>>24-8*(b%4)&255;c.push((d>>>4).toString(16));c.push((d&15).toString(16))}return c.join("")},parse:function(a){for(var e=a.length,c=[],b=0;b<e;b+=2)c[b>>>3]|=parseInt(a.substr(b,2),16)<<24-4*(b%8);return o.create(c,e/2)}},n=m.Latin1={stringify:function(a){for(var e=
a.words,a=a.sigBytes,c=[],b=0;b<a;b++)c.push(String.fromCharCode(e[b>>>2]>>>24-8*(b%4)&255));return c.join("")},parse:function(a){for(var e=a.length,c=[],b=0;b<e;b++)c[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return o.create(c,e)}},k=m.Utf8={stringify:function(a){try{return decodeURIComponent(escape(n.stringify(a)))}catch(e){throw Error("Malformed UTF-8 data");}},parse:function(a){return n.parse(unescape(encodeURIComponent(a)))}},f=l.BufferedBlockAlgorithm=r.extend({reset:function(){this._data=o.create();
this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=k.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var e=this._data,c=e.words,b=e.sigBytes,d=this.blockSize,q=b/(4*d),q=a?p.ceil(q):p.max((q|0)-this._minBufferSize,0),a=q*d,b=p.min(4*a,b);if(a){for(var j=0;j<a;j+=d)this._doProcessBlock(c,j);j=c.splice(0,a);e.sigBytes-=b}return o.create(j,b)},clone:function(){var a=r.clone.call(this);a._data=this._data.clone();return a},_minBufferSize:0});l.Hasher=f.extend({init:function(){this.reset()},
reset:function(){f.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);this._doFinalize();return this._hash},clone:function(){var a=f.clone.call(this);a._hash=this._hash.clone();return a},blockSize:16,_createHelper:function(a){return function(e,c){return a.create(c).finalize(e)}},_createHmacHelper:function(a){return function(e,c){return g.HMAC.create(a,c).finalize(e)}}});var g=i.algo={};return i}(Math);
(function(){var p=CryptoJS,h=p.lib.WordArray;p.enc.Base64={stringify:function(i){var l=i.words,h=i.sigBytes,o=this._map;i.clamp();for(var i=[],m=0;m<h;m+=3)for(var s=(l[m>>>2]>>>24-8*(m%4)&255)<<16|(l[m+1>>>2]>>>24-8*((m+1)%4)&255)<<8|l[m+2>>>2]>>>24-8*((m+2)%4)&255,n=0;4>n&&m+0.75*n<h;n++)i.push(o.charAt(s>>>6*(3-n)&63));if(l=o.charAt(64))for(;i.length%4;)i.push(l);return i.join("")},parse:function(i){var i=i.replace(/\s/g,""),l=i.length,r=this._map,o=r.charAt(64);o&&(o=i.indexOf(o),-1!=o&&(l=o));
for(var o=[],m=0,s=0;s<l;s++)if(s%4){var n=r.indexOf(i.charAt(s-1))<<2*(s%4),k=r.indexOf(i.charAt(s))>>>6-2*(s%4);o[m>>>2]|=(n|k)<<24-8*(m%4);m++}return h.create(o,m)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
(function(p){function h(f,g,a,e,c,b,d){f=f+(g&a|~g&e)+c+d;return(f<<b|f>>>32-b)+g}function i(f,g,a,e,c,b,d){f=f+(g&e|a&~e)+c+d;return(f<<b|f>>>32-b)+g}function l(f,g,a,e,c,b,d){f=f+(g^a^e)+c+d;return(f<<b|f>>>32-b)+g}function r(f,g,a,e,c,b,d){f=f+(a^(g|~e))+c+d;return(f<<b|f>>>32-b)+g}var o=CryptoJS,m=o.lib,s=m.WordArray,m=m.Hasher,n=o.algo,k=[];(function(){for(var f=0;64>f;f++)k[f]=4294967296*p.abs(p.sin(f+1))|0})();n=n.MD5=m.extend({_doReset:function(){this._hash=s.create([1732584193,4023233417,
2562383102,271733878])},_doProcessBlock:function(f,g){for(var a=0;16>a;a++){var e=g+a,c=f[e];f[e]=(c<<8|c>>>24)&16711935|(c<<24|c>>>8)&4278255360}for(var e=this._hash.words,c=e[0],b=e[1],d=e[2],q=e[3],a=0;64>a;a+=4)16>a?(c=h(c,b,d,q,f[g+a],7,k[a]),q=h(q,c,b,d,f[g+a+1],12,k[a+1]),d=h(d,q,c,b,f[g+a+2],17,k[a+2]),b=h(b,d,q,c,f[g+a+3],22,k[a+3])):32>a?(c=i(c,b,d,q,f[g+(a+1)%16],5,k[a]),q=i(q,c,b,d,f[g+(a+6)%16],9,k[a+1]),d=i(d,q,c,b,f[g+(a+11)%16],14,k[a+2]),b=i(b,d,q,c,f[g+a%16],20,k[a+3])):48>a?(c=
l(c,b,d,q,f[g+(3*a+5)%16],4,k[a]),q=l(q,c,b,d,f[g+(3*a+8)%16],11,k[a+1]),d=l(d,q,c,b,f[g+(3*a+11)%16],16,k[a+2]),b=l(b,d,q,c,f[g+(3*a+14)%16],23,k[a+3])):(c=r(c,b,d,q,f[g+3*a%16],6,k[a]),q=r(q,c,b,d,f[g+(3*a+7)%16],10,k[a+1]),d=r(d,q,c,b,f[g+(3*a+14)%16],15,k[a+2]),b=r(b,d,q,c,f[g+(3*a+5)%16],21,k[a+3]));e[0]=e[0]+c|0;e[1]=e[1]+b|0;e[2]=e[2]+d|0;e[3]=e[3]+q|0},_doFinalize:function(){var f=this._data,g=f.words,a=8*this._nDataBytes,e=8*f.sigBytes;g[e>>>5]|=128<<24-e%32;g[(e+64>>>9<<4)+14]=(a<<8|a>>>
24)&16711935|(a<<24|a>>>8)&4278255360;f.sigBytes=4*(g.length+1);this._process();f=this._hash.words;for(g=0;4>g;g++)a=f[g],f[g]=(a<<8|a>>>24)&16711935|(a<<24|a>>>8)&4278255360}});o.MD5=m._createHelper(n);o.HmacMD5=m._createHmacHelper(n)})(Math);
(function(){var p=CryptoJS,h=p.lib,i=h.Base,l=h.WordArray,h=p.algo,r=h.EvpKDF=i.extend({cfg:i.extend({keySize:4,hasher:h.MD5,iterations:1}),init:function(i){this.cfg=this.cfg.extend(i)},compute:function(i,m){for(var h=this.cfg,n=h.hasher.create(),k=l.create(),f=k.words,g=h.keySize,h=h.iterations;f.length<g;){a&&n.update(a);var a=n.update(i).finalize(m);n.reset();for(var e=1;e<h;e++)a=n.finalize(a),n.reset();k.concat(a)}k.sigBytes=4*g;return k}});p.EvpKDF=function(i,l,h){return r.create(h).compute(i,
l)}})();
CryptoJS.lib.Cipher||function(p){var h=CryptoJS,i=h.lib,l=i.Base,r=i.WordArray,o=i.BufferedBlockAlgorithm,m=h.enc.Base64,s=h.algo.EvpKDF,n=i.Cipher=o.extend({cfg:l.extend(),createEncryptor:function(b,d){return this.create(this._ENC_XFORM_MODE,b,d)},createDecryptor:function(b,d){return this.create(this._DEC_XFORM_MODE,b,d)},init:function(b,d,a){this.cfg=this.cfg.extend(a);this._xformMode=b;this._key=d;this.reset()},reset:function(){o.reset.call(this);this._doReset()},process:function(b){this._append(b);return this._process()},
finalize:function(b){b&&this._append(b);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(){return function(b){return{encrypt:function(a,q,j){return("string"==typeof q?c:e).encrypt(b,a,q,j)},decrypt:function(a,q,j){return("string"==typeof q?c:e).decrypt(b,a,q,j)}}}}()});i.StreamCipher=n.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var k=h.mode={},f=i.BlockCipherMode=l.extend({createEncryptor:function(b,a){return this.Encryptor.create(b,
a)},createDecryptor:function(b,a){return this.Decryptor.create(b,a)},init:function(b,a){this._cipher=b;this._iv=a}}),k=k.CBC=function(){function b(b,a,d){var c=this._iv;c?this._iv=p:c=this._prevBlock;for(var e=0;e<d;e++)b[a+e]^=c[e]}var a=f.extend();a.Encryptor=a.extend({processBlock:function(a,d){var c=this._cipher,e=c.blockSize;b.call(this,a,d,e);c.encryptBlock(a,d);this._prevBlock=a.slice(d,d+e)}});a.Decryptor=a.extend({processBlock:function(a,d){var c=this._cipher,e=c.blockSize,f=a.slice(d,d+
e);c.decryptBlock(a,d);b.call(this,a,d,e);this._prevBlock=f}});return a}(),g=(h.pad={}).Pkcs7={pad:function(b,a){for(var c=4*a,c=c-b.sigBytes%c,e=c<<24|c<<16|c<<8|c,f=[],g=0;g<c;g+=4)f.push(e);c=r.create(f,c);b.concat(c)},unpad:function(b){b.sigBytes-=b.words[b.sigBytes-1>>>2]&255}};i.BlockCipher=n.extend({cfg:n.cfg.extend({mode:k,padding:g}),reset:function(){n.reset.call(this);var b=this.cfg,a=b.iv,b=b.mode;if(this._xformMode==this._ENC_XFORM_MODE)var c=b.createEncryptor;else c=b.createDecryptor,
this._minBufferSize=1;this._mode=c.call(b,this,a&&a.words)},_doProcessBlock:function(b,a){this._mode.processBlock(b,a)},_doFinalize:function(){var b=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){b.pad(this._data,this.blockSize);var a=this._process(!0)}else a=this._process(!0),b.unpad(a);return a},blockSize:4});var a=i.CipherParams=l.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),k=(h.format={}).OpenSSL={stringify:function(a){var d=
a.ciphertext,a=a.salt,d=(a?r.create([1398893684,1701076831]).concat(a).concat(d):d).toString(m);return d=d.replace(/(.{64})/g,"$1\n")},parse:function(b){var b=m.parse(b),d=b.words;if(1398893684==d[0]&&1701076831==d[1]){var c=r.create(d.slice(2,4));d.splice(0,4);b.sigBytes-=16}return a.create({ciphertext:b,salt:c})}},e=i.SerializableCipher=l.extend({cfg:l.extend({format:k}),encrypt:function(b,d,c,e){var e=this.cfg.extend(e),f=b.createEncryptor(c,e),d=f.finalize(d),f=f.cfg;return a.create({ciphertext:d,
key:c,iv:f.iv,algorithm:b,mode:f.mode,padding:f.padding,blockSize:b.blockSize,formatter:e.format})},decrypt:function(a,c,e,f){f=this.cfg.extend(f);c=this._parse(c,f.format);return a.createDecryptor(e,f).finalize(c.ciphertext)},_parse:function(a,c){return"string"==typeof a?c.parse(a):a}}),h=(h.kdf={}).OpenSSL={compute:function(b,c,e,f){f||(f=r.random(8));b=s.create({keySize:c+e}).compute(b,f);e=r.create(b.words.slice(c),4*e);b.sigBytes=4*c;return a.create({key:b,iv:e,salt:f})}},c=i.PasswordBasedCipher=
e.extend({cfg:e.cfg.extend({kdf:h}),encrypt:function(a,c,f,j){j=this.cfg.extend(j);f=j.kdf.compute(f,a.keySize,a.ivSize);j.iv=f.iv;a=e.encrypt.call(this,a,c,f.key,j);a.mixIn(f);return a},decrypt:function(a,c,f,j){j=this.cfg.extend(j);c=this._parse(c,j.format);f=j.kdf.compute(f,a.keySize,a.ivSize,c.salt);j.iv=f.iv;return e.decrypt.call(this,a,c,f.key,j)}})}();
(function(){var p=CryptoJS,h=p.lib.BlockCipher,i=p.algo,l=[],r=[],o=[],m=[],s=[],n=[],k=[],f=[],g=[],a=[];(function(){for(var c=[],b=0;256>b;b++)c[b]=128>b?b<<1:b<<1^283;for(var d=0,e=0,b=0;256>b;b++){var j=e^e<<1^e<<2^e<<3^e<<4,j=j>>>8^j&255^99;l[d]=j;r[j]=d;var i=c[d],h=c[i],p=c[h],t=257*c[j]^16843008*j;o[d]=t<<24|t>>>8;m[d]=t<<16|t>>>16;s[d]=t<<8|t>>>24;n[d]=t;t=16843009*p^65537*h^257*i^16843008*d;k[j]=t<<24|t>>>8;f[j]=t<<16|t>>>16;g[j]=t<<8|t>>>24;a[j]=t;d?(d=i^c[c[c[p^i]]],e^=c[c[e]]):d=e=1}})();
var e=[0,1,2,4,8,16,32,64,128,27,54],i=i.AES=h.extend({_doReset:function(){for(var c=this._key,b=c.words,d=c.sigBytes/4,c=4*((this._nRounds=d+6)+1),i=this._keySchedule=[],j=0;j<c;j++)if(j<d)i[j]=b[j];else{var h=i[j-1];j%d?6<d&&4==j%d&&(h=l[h>>>24]<<24|l[h>>>16&255]<<16|l[h>>>8&255]<<8|l[h&255]):(h=h<<8|h>>>24,h=l[h>>>24]<<24|l[h>>>16&255]<<16|l[h>>>8&255]<<8|l[h&255],h^=e[j/d|0]<<24);i[j]=i[j-d]^h}b=this._invKeySchedule=[];for(d=0;d<c;d++)j=c-d,h=d%4?i[j]:i[j-4],b[d]=4>d||4>=j?h:k[l[h>>>24]]^f[l[h>>>
16&255]]^g[l[h>>>8&255]]^a[l[h&255]]},encryptBlock:function(a,b){this._doCryptBlock(a,b,this._keySchedule,o,m,s,n,l)},decryptBlock:function(c,b){var d=c[b+1];c[b+1]=c[b+3];c[b+3]=d;this._doCryptBlock(c,b,this._invKeySchedule,k,f,g,a,r);d=c[b+1];c[b+1]=c[b+3];c[b+3]=d},_doCryptBlock:function(a,b,d,e,f,h,i,g){for(var l=this._nRounds,k=a[b]^d[0],m=a[b+1]^d[1],o=a[b+2]^d[2],n=a[b+3]^d[3],p=4,r=1;r<l;r++)var s=e[k>>>24]^f[m>>>16&255]^h[o>>>8&255]^i[n&255]^d[p++],u=e[m>>>24]^f[o>>>16&255]^h[n>>>8&255]^
i[k&255]^d[p++],v=e[o>>>24]^f[n>>>16&255]^h[k>>>8&255]^i[m&255]^d[p++],n=e[n>>>24]^f[k>>>16&255]^h[m>>>8&255]^i[o&255]^d[p++],k=s,m=u,o=v;s=(g[k>>>24]<<24|g[m>>>16&255]<<16|g[o>>>8&255]<<8|g[n&255])^d[p++];u=(g[m>>>24]<<24|g[o>>>16&255]<<16|g[n>>>8&255]<<8|g[k&255])^d[p++];v=(g[o>>>24]<<24|g[n>>>16&255]<<16|g[k>>>8&255]<<8|g[m&255])^d[p++];n=(g[n>>>24]<<24|g[k>>>16&255]<<16|g[m>>>8&255]<<8|g[o&255])^d[p++];a[b]=s;a[b+1]=u;a[b+2]=v;a[b+3]=n},keySize:8});p.AES=h._createHelper(i)})();

define("crypto-js/rollups/aes", function(){});

// Hack to allow using encoding.js with only utf8.
// Right now there's a bug where it expects global['encoding-indexes']:
//
//  function index(name) {
//    if (!('encoding-indexes' in global))
//      throw new Error("Indexes missing. Did you forget to include encoding-indexes.js?");
//    return global['encoding-indexes'][name];
//  }
(function(global) {
  global['encoding-indexes'] = global['encoding-indexes'] || [];
}(this));

define("encoding-indexes-shim", function(){});

/*!
 * Shim implementation of the TextEncoder, TextDecoder spec:
 * http://encoding.spec.whatwg.org/#interface-textencoder
 *
 * http://code.google.com/p/stringencoding/source/browse/encoding.js
 * 09b44d71759d on Sep 19, 2013
 * Used under Apache License 2.0 - http://code.google.com/p/stringencoding/
 */
(function(global) {


  //
  // Utilities
  //

  /**
   * @param {number} a The number to test.
   * @param {number} min The minimum value in the range, inclusive.
   * @param {number} max The maximum value in the range, inclusive.
   * @return {boolean} True if a >= min and a <= max.
   */
  function inRange(a, min, max) {
    return min <= a && a <= max;
  }

  /**
   * @param {number} n The numerator.
   * @param {number} d The denominator.
   * @return {number} The result of the integer division of n by d.
   */
  function div(n, d) {
    return Math.floor(n / d);
  }


  //
  // Implementation of Encoding specification
  // http://dvcs.w3.org/hg/encoding/raw-file/tip/Overview.html
  //

  //
  // 3. Terminology
  //

  //
  // 4. Encodings
  //

  /** @const */ var EOF_byte = -1;
  /** @const */ var EOF_code_point = -1;

  /**
   * @constructor
   * @param {Uint8Array} bytes Array of bytes that provide the stream.
   */
  function ByteInputStream(bytes) {
    /** @type {number} */
    var pos = 0;

    /** @return {number} Get the next byte from the stream. */
    this.get = function() {
      return (pos >= bytes.length) ? EOF_byte : Number(bytes[pos]);
    };

    /** @param {number} n Number (positive or negative) by which to
     *      offset the byte pointer. */
    this.offset = function(n) {
      pos += n;
      if (pos < 0) {
        throw new Error('Seeking past start of the buffer');
      }
      if (pos > bytes.length) {
        throw new Error('Seeking past EOF');
      }
    };

    /**
     * @param {Array.<number>} test Array of bytes to compare against.
     * @return {boolean} True if the start of the stream matches the test
     *     bytes.
     */
    this.match = function(test) {
      if (test.length > pos + bytes.length) {
        return false;
      }
      var i;
      for (i = 0; i < test.length; i += 1) {
        if (Number(bytes[pos + i]) !== test[i]) {
          return false;
        }
      }
      return true;
    };
  }

  /**
   * @constructor
   * @param {Array.<number>} bytes The array to write bytes into.
   */
  function ByteOutputStream(bytes) {
    /** @type {number} */
    var pos = 0;

    /**
     * @param {...number} var_args The byte or bytes to emit into the stream.
     * @return {number} The last byte emitted.
     */
    this.emit = function(var_args) {
      /** @type {number} */
      var last = EOF_byte;
      var i;
      for (i = 0; i < arguments.length; ++i) {
        last = Number(arguments[i]);
        bytes[pos++] = last;
      }
      return last;
    };
  }

  /**
   * @constructor
   * @param {string} string The source of code units for the stream.
   */
  function CodePointInputStream(string) {
    /**
     * @param {string} string Input string of UTF-16 code units.
     * @return {Array.<number>} Code points.
     */
    function stringToCodePoints(string) {
      /** @type {Array.<number>} */
      var cps = [];
      // Based on http://www.w3.org/TR/WebIDL/#idl-DOMString
      var i = 0, n = string.length;
      while (i < string.length) {
        var c = string.charCodeAt(i);
        if (!inRange(c, 0xD800, 0xDFFF)) {
          cps.push(c);
        } else if (inRange(c, 0xDC00, 0xDFFF)) {
          cps.push(0xFFFD);
        } else { // (inRange(cu, 0xD800, 0xDBFF))
          if (i === n - 1) {
            cps.push(0xFFFD);
          } else {
            var d = string.charCodeAt(i + 1);
            if (inRange(d, 0xDC00, 0xDFFF)) {
              var a = c & 0x3FF;
              var b = d & 0x3FF;
              i += 1;
              cps.push(0x10000 + (a << 10) + b);
            } else {
              cps.push(0xFFFD);
            }
          }
        }
        i += 1;
      }
      return cps;
    }

    /** @type {number} */
    var pos = 0;
    /** @type {Array.<number>} */
    var cps = stringToCodePoints(string);

    /** @param {number} n The number of bytes (positive or negative)
     *      to advance the code point pointer by.*/
    this.offset = function(n) {
      pos += n;
      if (pos < 0) {
        throw new Error('Seeking past start of the buffer');
      }
      if (pos > cps.length) {
        throw new Error('Seeking past EOF');
      }
    };


    /** @return {number} Get the next code point from the stream. */
    this.get = function() {
      if (pos >= cps.length) {
        return EOF_code_point;
      }
      return cps[pos];
    };
  }

  /**
   * @constructor
   */
  function CodePointOutputStream() {
    /** @type {string} */
    var string = '';

    /** @return {string} The accumulated string. */
    this.string = function() {
      return string;
    };

    /** @param {number} c The code point to encode into the stream. */
    this.emit = function(c) {
      if (c <= 0xFFFF) {
        string += String.fromCharCode(c);
      } else {
        c -= 0x10000;
        string += String.fromCharCode(0xD800 + ((c >> 10) & 0x3ff));
        string += String.fromCharCode(0xDC00 + (c & 0x3ff));
      }
    };
  }

  /**
   * @constructor
   * @param {string} message Description of the error.
   */
  function EncodingError(message) {
    this.name = 'EncodingError';
    this.message = message;
    this.code = 0;
  }
  EncodingError.prototype = Error.prototype;

  /**
   * @param {boolean} fatal If true, decoding errors raise an exception.
   * @param {number=} opt_code_point Override the standard fallback code point.
   * @return {number} The code point to insert on a decoding error.
   */
  function decoderError(fatal, opt_code_point) {
    if (fatal) {
      throw new EncodingError('Decoder error');
    }
    return opt_code_point || 0xFFFD;
  }

  /**
   * @param {number} code_point The code point that could not be encoded.
   */
  function encoderError(code_point) {
    throw new EncodingError('The code point ' + code_point +
                            ' could not be encoded.');
  }

  /**
   * @param {string} label The encoding label.
   * @return {?{name:string,labels:Array.<string>}}
   */
  function getEncoding(label) {
    label = String(label).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(label_to_encoding, label)) {
      return label_to_encoding[label];
    }
    return null;
  }

  /** @type {Array.<{encodings: Array.<{name:string,labels:Array.<string>}>,
   *      heading: string}>} */
  var encodings = [
    {
      "encodings": [
        {
          "labels": [
            "unicode-1-1-utf-8",
            "utf-8",
            "utf8"
          ],
          "name": "utf-8"
        }
      ],
      "heading": "The Encoding"
    },
    {
      "encodings": [
        {
          "labels": [
            "866",
            "cp866",
            "csibm866",
            "ibm866"
          ],
          "name": "ibm866"
        },
        {
          "labels": [
            "csisolatin2",
            "iso-8859-2",
            "iso-ir-101",
            "iso8859-2",
            "iso88592",
            "iso_8859-2",
            "iso_8859-2:1987",
            "l2",
            "latin2"
          ],
          "name": "iso-8859-2"
        },
        {
          "labels": [
            "csisolatin3",
            "iso-8859-3",
            "iso-ir-109",
            "iso8859-3",
            "iso88593",
            "iso_8859-3",
            "iso_8859-3:1988",
            "l3",
            "latin3"
          ],
          "name": "iso-8859-3"
        },
        {
          "labels": [
            "csisolatin4",
            "iso-8859-4",
            "iso-ir-110",
            "iso8859-4",
            "iso88594",
            "iso_8859-4",
            "iso_8859-4:1988",
            "l4",
            "latin4"
          ],
          "name": "iso-8859-4"
        },
        {
          "labels": [
            "csisolatincyrillic",
            "cyrillic",
            "iso-8859-5",
            "iso-ir-144",
            "iso8859-5",
            "iso88595",
            "iso_8859-5",
            "iso_8859-5:1988"
          ],
          "name": "iso-8859-5"
        },
        {
          "labels": [
            "arabic",
            "asmo-708",
            "csiso88596e",
            "csiso88596i",
            "csisolatinarabic",
            "ecma-114",
            "iso-8859-6",
            "iso-8859-6-e",
            "iso-8859-6-i",
            "iso-ir-127",
            "iso8859-6",
            "iso88596",
            "iso_8859-6",
            "iso_8859-6:1987"
          ],
          "name": "iso-8859-6"
        },
        {
          "labels": [
            "csisolatingreek",
            "ecma-118",
            "elot_928",
            "greek",
            "greek8",
            "iso-8859-7",
            "iso-ir-126",
            "iso8859-7",
            "iso88597",
            "iso_8859-7",
            "iso_8859-7:1987",
            "sun_eu_greek"
          ],
          "name": "iso-8859-7"
        },
        {
          "labels": [
            "csiso88598e",
            "csisolatinhebrew",
            "hebrew",
            "iso-8859-8",
            "iso-8859-8-e",
            "iso-ir-138",
            "iso8859-8",
            "iso88598",
            "iso_8859-8",
            "iso_8859-8:1988",
            "visual"
          ],
          "name": "iso-8859-8"
        },
        {
          "labels": [
            "csiso88598i",
            "iso-8859-8-i",
            "logical"
          ],
          "name": "iso-8859-8-i"
        },
        {
          "labels": [
            "csisolatin6",
            "iso-8859-10",
            "iso-ir-157",
            "iso8859-10",
            "iso885910",
            "l6",
            "latin6"
          ],
          "name": "iso-8859-10"
        },
        {
          "labels": [
            "iso-8859-13",
            "iso8859-13",
            "iso885913"
          ],
          "name": "iso-8859-13"
        },
        {
          "labels": [
            "iso-8859-14",
            "iso8859-14",
            "iso885914"
          ],
          "name": "iso-8859-14"
        },
        {
          "labels": [
            "csisolatin9",
            "iso-8859-15",
            "iso8859-15",
            "iso885915",
            "iso_8859-15",
            "l9"
          ],
          "name": "iso-8859-15"
        },
        {
          "labels": [
            "iso-8859-16"
          ],
          "name": "iso-8859-16"
        },
        {
          "labels": [
            "cskoi8r",
            "koi",
            "koi8",
            "koi8-r",
            "koi8_r"
          ],
          "name": "koi8-r"
        },
        {
          "labels": [
            "koi8-u"
          ],
          "name": "koi8-u"
        },
        {
          "labels": [
            "csmacintosh",
            "mac",
            "macintosh",
            "x-mac-roman"
          ],
          "name": "macintosh"
        },
        {
          "labels": [
            "dos-874",
            "iso-8859-11",
            "iso8859-11",
            "iso885911",
            "tis-620",
            "windows-874"
          ],
          "name": "windows-874"
        },
        {
          "labels": [
            "cp1250",
            "windows-1250",
            "x-cp1250"
          ],
          "name": "windows-1250"
        },
        {
          "labels": [
            "cp1251",
            "windows-1251",
            "x-cp1251"
          ],
          "name": "windows-1251"
        },
        {
          "labels": [
            "ansi_x3.4-1968",
            "ascii",
            "cp1252",
            "cp819",
            "csisolatin1",
            "ibm819",
            "iso-8859-1",
            "iso-ir-100",
            "iso8859-1",
            "iso88591",
            "iso_8859-1",
            "iso_8859-1:1987",
            "l1",
            "latin1",
            "us-ascii",
            "windows-1252",
            "x-cp1252"
          ],
          "name": "windows-1252"
        },
        {
          "labels": [
            "cp1253",
            "windows-1253",
            "x-cp1253"
          ],
          "name": "windows-1253"
        },
        {
          "labels": [
            "cp1254",
            "csisolatin5",
            "iso-8859-9",
            "iso-ir-148",
            "iso8859-9",
            "iso88599",
            "iso_8859-9",
            "iso_8859-9:1989",
            "l5",
            "latin5",
            "windows-1254",
            "x-cp1254"
          ],
          "name": "windows-1254"
        },
        {
          "labels": [
            "cp1255",
            "windows-1255",
            "x-cp1255"
          ],
          "name": "windows-1255"
        },
        {
          "labels": [
            "cp1256",
            "windows-1256",
            "x-cp1256"
          ],
          "name": "windows-1256"
        },
        {
          "labels": [
            "cp1257",
            "windows-1257",
            "x-cp1257"
          ],
          "name": "windows-1257"
        },
        {
          "labels": [
            "cp1258",
            "windows-1258",
            "x-cp1258"
          ],
          "name": "windows-1258"
        },
        {
          "labels": [
            "x-mac-cyrillic",
            "x-mac-ukrainian"
          ],
          "name": "x-mac-cyrillic"
        }
      ],
      "heading": "Legacy single-byte encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "chinese",
            "csgb2312",
            "csiso58gb231280",
            "gb2312",
            "gb_2312",
            "gb_2312-80",
            "gbk",
            "iso-ir-58",
            "x-gbk"
          ],
          "name": "gbk"
        },
        {
          "labels": [
            "gb18030"
          ],
          "name": "gb18030"
        },
        {
          "labels": [
            "hz-gb-2312"
          ],
          "name": "hz-gb-2312"
        }
      ],
      "heading": "Legacy multi-byte Chinese (simplified) encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "big5",
            "big5-hkscs",
            "cn-big5",
            "csbig5",
            "x-x-big5"
          ],
          "name": "big5"
        }
      ],
      "heading": "Legacy multi-byte Chinese (traditional) encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "cseucpkdfmtjapanese",
            "euc-jp",
            "x-euc-jp"
          ],
          "name": "euc-jp"
        },
        {
          "labels": [
            "csiso2022jp",
            "iso-2022-jp"
          ],
          "name": "iso-2022-jp"
        },
        {
          "labels": [
            "csshiftjis",
            "ms_kanji",
            "shift-jis",
            "shift_jis",
            "sjis",
            "windows-31j",
            "x-sjis"
          ],
          "name": "shift_jis"
        }
      ],
      "heading": "Legacy multi-byte Japanese encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "cseuckr",
            "csksc56011987",
            "euc-kr",
            "iso-ir-149",
            "korean",
            "ks_c_5601-1987",
            "ks_c_5601-1989",
            "ksc5601",
            "ksc_5601",
            "windows-949"
          ],
          "name": "euc-kr"
        }
      ],
      "heading": "Legacy multi-byte Korean encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "csiso2022kr",
            "iso-2022-kr",
            "iso-2022-cn",
            "iso-2022-cn-ext"
          ],
          "name": "replacement"
        },
        {
          "labels": [
            "utf-16be"
          ],
          "name": "utf-16be"
        },
        {
          "labels": [
            "utf-16",
            "utf-16le"
          ],
          "name": "utf-16le"
        },
        {
          "labels": [
            "x-user-defined"
          ],
          "name": "x-user-defined"
        }
      ],
      "heading": "Legacy miscellaneous encodings"
    }
  ];

  var name_to_encoding = {};
  var label_to_encoding = {};
  encodings.forEach(function(category) {
    category.encodings.forEach(function(encoding) {
      name_to_encoding[encoding.name] = encoding;
      encoding.labels.forEach(function(label) {
        label_to_encoding[label] = encoding;
      });
    });
  });

  //
  // 5. Indexes
  //

  /**
   * @param {number} pointer The |pointer| to search for.
   * @param {Array.<?number>} index The |index| to search within.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in |index|.
   */
  function indexCodePointFor(pointer, index) {
    return (index || [])[pointer] || null;
  }

  /**
   * @param {number} code_point The |code point| to search for.
   * @param {Array.<?number>} index The |index| to search within.
   * @return {?number} The first pointer corresponding to |code point| in
   *     |index|, or null if |code point| is not in |index|.
   */
  function indexPointerFor(code_point, index) {
    var pointer = index.indexOf(code_point);
    return pointer === -1 ? null : pointer;
  }

  /**
   * @param {string} name Name of the index.
   * @return {(Array.<number>|Array.<Array.<number>>)}
   *  */
  function index(name) {
    if (!('encoding-indexes' in global))
      throw new Error("Indexes missing. Did you forget to include encoding-indexes.js?");
    return global['encoding-indexes'][name];
  }

  /**
   * @param {number} pointer The |pointer| to search for in the gb18030 index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the gb18030 index.
   */
  function indexGB18030CodePointFor(pointer) {
    if ((pointer > 39419 && pointer < 189000) || (pointer > 1237575)) {
      return null;
    }
    var /** @type {number} */ offset = 0,
        /** @type {number} */ code_point_offset = 0,
        /** @type {Array.<Array.<number>>} */ idx = index('gb18030');
    var i;
    for (i = 0; i < idx.length; ++i) {
      var entry = idx[i];
      if (entry[0] <= pointer) {
        offset = entry[0];
        code_point_offset = entry[1];
      } else {
        break;
      }
    }
    return code_point_offset + pointer - offset;
  }

  /**
   * @param {number} code_point The |code point| to locate in the gb18030 index.
   * @return {number} The first pointer corresponding to |code point| in the
   *     gb18030 index.
   */
  function indexGB18030PointerFor(code_point) {
    var /** @type {number} */ offset = 0,
        /** @type {number} */ pointer_offset = 0,
        /** @type {Array.<Array.<number>>} */ idx = index('gb18030');
    var i;
    for (i = 0; i < idx.length; ++i) {
      var entry = idx[i];
      if (entry[1] <= code_point) {
        offset = entry[1];
        pointer_offset = entry[0];
      } else {
        break;
      }
    }
    return pointer_offset + code_point - offset;
  }

  //
  // 7. The encoding
  //

  // 7.1 utf-8

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function UTF8Decoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ utf8_code_point = 0,
        /** @type {number} */ utf8_bytes_needed = 0,
        /** @type {number} */ utf8_bytes_seen = 0,
        /** @type {number} */ utf8_lower_boundary = 0;

    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte) {
        if (utf8_bytes_needed !== 0) {
          return decoderError(fatal);
        }
        return EOF_code_point;
      }
      byte_pointer.offset(1);

      if (utf8_bytes_needed === 0) {
        if (inRange(bite, 0x00, 0x7F)) {
          return bite;
        }
        if (inRange(bite, 0xC2, 0xDF)) {
          utf8_bytes_needed = 1;
          utf8_lower_boundary = 0x80;
          utf8_code_point = bite - 0xC0;
        } else if (inRange(bite, 0xE0, 0xEF)) {
          utf8_bytes_needed = 2;
          utf8_lower_boundary = 0x800;
          utf8_code_point = bite - 0xE0;
        } else if (inRange(bite, 0xF0, 0xF4)) {
          utf8_bytes_needed = 3;
          utf8_lower_boundary = 0x10000;
          utf8_code_point = bite - 0xF0;
        } else {
          return decoderError(fatal);
        }
        utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
        return null;
      }
      if (!inRange(bite, 0x80, 0xBF)) {
        utf8_code_point = 0;
        utf8_bytes_needed = 0;
        utf8_bytes_seen = 0;
        utf8_lower_boundary = 0;
        byte_pointer.offset(-1);
        return decoderError(fatal);
      }
      utf8_bytes_seen += 1;
      utf8_code_point = utf8_code_point + (bite - 0x80) *
          Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);
      if (utf8_bytes_seen !== utf8_bytes_needed) {
        return null;
      }
      var code_point = utf8_code_point;
      var lower_boundary = utf8_lower_boundary;
      utf8_code_point = 0;
      utf8_bytes_needed = 0;
      utf8_bytes_seen = 0;
      utf8_lower_boundary = 0;
      if (inRange(code_point, lower_boundary, 0x10FFFF) &&
          !inRange(code_point, 0xD800, 0xDFFF)) {
        return code_point;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function UTF8Encoder(options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0xD800, 0xDFFF)) {
        return encoderError(code_point);
      }
      if (inRange(code_point, 0x0000, 0x007f)) {
        return output_byte_stream.emit(code_point);
      }
      var count, offset;
      if (inRange(code_point, 0x0080, 0x07FF)) {
        count = 1;
        offset = 0xC0;
      } else if (inRange(code_point, 0x0800, 0xFFFF)) {
        count = 2;
        offset = 0xE0;
      } else if (inRange(code_point, 0x10000, 0x10FFFF)) {
        count = 3;
        offset = 0xF0;
      }
      var result = output_byte_stream.emit(
          div(code_point, Math.pow(64, count)) + offset);
      while (count > 0) {
        var temp = div(code_point, Math.pow(64, count - 1));
        result = output_byte_stream.emit(0x80 + (temp % 64));
        count -= 1;
      }
      return result;
    };
  }

  name_to_encoding['utf-8'].getEncoder = function(options) {
    return new UTF8Encoder(options);
  };
  name_to_encoding['utf-8'].getDecoder = function(options) {
    return new UTF8Decoder(options);
  };

  //
  // 8. Legacy single-byte encodings
  //

  /**
   * @constructor
   * @param {Array.<number>} index The encoding index.
   * @param {{fatal: boolean}} options
   */
  function SingleByteDecoder(index, options) {
    var fatal = options.fatal;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte) {
        return EOF_code_point;
      }
      byte_pointer.offset(1);
      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }
      var code_point = index[bite - 0x80];
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    };
  }

  /**
   * @constructor
   * @param {Array.<?number>} index The encoding index.
   * @param {{fatal: boolean}} options
   */
  function SingleByteEncoder(index, options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      var pointer = indexPointerFor(code_point, index);
      if (pointer === null) {
        encoderError(code_point);
      }
      return output_byte_stream.emit(pointer + 0x80);
    };
  }

  (function() {
    encodings.forEach(function(category) {
      if (category.heading !== 'Legacy single-byte encodings')
        return;
      category.encodings.forEach(function(encoding) {
        var idx = index(encoding.name);
        encoding.getDecoder = function(options) {
          return new SingleByteDecoder(idx, options);
        };
        encoding.getEncoder = function(options) {
          return new SingleByteEncoder(idx, options);
        };
      });
    });
  }());

  //
  // 9. Legacy multi-byte Chinese (simplified) encodings
  //

  // 9.1 gbk

  /**
   * @constructor
   * @param {boolean} gb18030 True if decoding gb18030, false otherwise.
   * @param {{fatal: boolean}} options
   */
  function GBKDecoder(gb18030, options) {
    var fatal = options.fatal;
    var /** @type {number} */ gbk_first = 0x00,
        /** @type {number} */ gbk_second = 0x00,
        /** @type {number} */ gbk_third = 0x00;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte && gbk_first === 0x00 &&
          gbk_second === 0x00 && gbk_third === 0x00) {
        return EOF_code_point;
      }
      if (bite === EOF_byte &&
          (gbk_first !== 0x00 || gbk_second !== 0x00 || gbk_third !== 0x00)) {
        gbk_first = 0x00;
        gbk_second = 0x00;
        gbk_third = 0x00;
        decoderError(fatal);
      }
      byte_pointer.offset(1);
      var code_point;
      if (gbk_third !== 0x00) {
        code_point = null;
        if (inRange(bite, 0x30, 0x39)) {
          code_point = indexGB18030CodePointFor(
              (((gbk_first - 0x81) * 10 + (gbk_second - 0x30)) * 126 +
               (gbk_third - 0x81)) * 10 + bite - 0x30);
        }
        gbk_first = 0x00;
        gbk_second = 0x00;
        gbk_third = 0x00;
        if (code_point === null) {
          byte_pointer.offset(-3);
          return decoderError(fatal);
        }
        return code_point;
      }
      if (gbk_second !== 0x00) {
        if (inRange(bite, 0x81, 0xFE)) {
          gbk_third = bite;
          return null;
        }
        byte_pointer.offset(-2);
        gbk_first = 0x00;
        gbk_second = 0x00;
        return decoderError(fatal);
      }
      if (gbk_first !== 0x00) {
        if (inRange(bite, 0x30, 0x39) && gb18030) {
          gbk_second = bite;
          return null;
        }
        var lead = gbk_first;
        var pointer = null;
        gbk_first = 0x00;
        var offset = bite < 0x7F ? 0x40 : 0x41;
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFE)) {
          pointer = (lead - 0x81) * 190 + (bite - offset);
        }
        code_point = pointer === null ? null :
            indexCodePointFor(pointer, index('gbk'));
        if (pointer === null) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }
      if (bite === 0x80) {
        return 0x20AC;
      }
      if (inRange(bite, 0x81, 0xFE)) {
        gbk_first = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {boolean} gb18030 True if decoding gb18030, false otherwise.
   * @param {{fatal: boolean}} options
   */
  function GBKEncoder(gb18030, options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      var pointer = indexPointerFor(code_point, index('gbk'));
      if (pointer !== null) {
        var lead = div(pointer, 190) + 0x81;
        var trail = pointer % 190;
        var offset = trail < 0x3F ? 0x40 : 0x41;
        return output_byte_stream.emit(lead, trail + offset);
      }
      if (pointer === null && !gb18030) {
        return encoderError(code_point);
      }
      pointer = indexGB18030PointerFor(code_point);
      var byte1 = div(div(div(pointer, 10), 126), 10);
      pointer = pointer - byte1 * 10 * 126 * 10;
      var byte2 = div(div(pointer, 10), 126);
      pointer = pointer - byte2 * 10 * 126;
      var byte3 = div(pointer, 10);
      var byte4 = pointer - byte3 * 10;
      return output_byte_stream.emit(byte1 + 0x81,
                                     byte2 + 0x30,
                                     byte3 + 0x81,
                                     byte4 + 0x30);
    };
  }

  name_to_encoding['gbk'].getEncoder = function(options) {
    return new GBKEncoder(false, options);
  };
  name_to_encoding['gbk'].getDecoder = function(options) {
    return new GBKDecoder(false, options);
  };

  // 9.2 gb18030
  name_to_encoding['gb18030'].getEncoder = function(options) {
    return new GBKEncoder(true, options);
  };
  name_to_encoding['gb18030'].getDecoder = function(options) {
    return new GBKDecoder(true, options);
  };

  // 9.3 hz-gb-2312

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function HZGB2312Decoder(options) {
    var fatal = options.fatal;
    var /** @type {boolean} */ hzgb2312 = false,
        /** @type {number} */ hzgb2312_lead = 0x00;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte && hzgb2312_lead === 0x00) {
        return EOF_code_point;
      }
      if (bite === EOF_byte && hzgb2312_lead !== 0x00) {
        hzgb2312_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (hzgb2312_lead === 0x7E) {
        hzgb2312_lead = 0x00;
        if (bite === 0x7B) {
          hzgb2312 = true;
          return null;
        }
        if (bite === 0x7D) {
          hzgb2312 = false;
          return null;
        }
        if (bite === 0x7E) {
          return 0x007E;
        }
        if (bite === 0x0A) {
          return null;
        }
        byte_pointer.offset(-1);
        return decoderError(fatal);
      }
      if (hzgb2312_lead !== 0x00) {
        var lead = hzgb2312_lead;
        hzgb2312_lead = 0x00;
        var code_point = null;
        if (inRange(bite, 0x21, 0x7E)) {
          code_point = indexCodePointFor((lead - 1) * 190 +
                                         (bite + 0x3F), index('gbk'));
        }
        if (bite === 0x0A) {
          hzgb2312 = false;
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (bite === 0x7E) {
        hzgb2312_lead = 0x7E;
        return null;
      }
      if (hzgb2312) {
        if (inRange(bite, 0x20, 0x7F)) {
          hzgb2312_lead = bite;
          return null;
        }
        if (bite === 0x0A) {
          hzgb2312 = false;
        }
        return decoderError(fatal);
      }
      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function HZGB2312Encoder(options) {
    var fatal = options.fatal;
    var hzgb2312 = false;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x007F) && hzgb2312) {
        code_point_pointer.offset(-1);
        hzgb2312 = false;
        return output_byte_stream.emit(0x7E, 0x7D);
      }
      if (code_point === 0x007E) {
        return output_byte_stream.emit(0x7E, 0x7E);
      }
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      if (!hzgb2312) {
        code_point_pointer.offset(-1);
        hzgb2312 = true;
        return output_byte_stream.emit(0x7E, 0x7B);
      }
      var pointer = indexPointerFor(code_point, index('gbk'));
      if (pointer === null) {
        return encoderError(code_point);
      }
      var lead = div(pointer, 190) + 1;
      var trail = pointer % 190 - 0x3F;
      if (!inRange(lead, 0x21, 0x7E) || !inRange(trail, 0x21, 0x7E)) {
        return encoderError(code_point);
      }
      return output_byte_stream.emit(lead, trail);
    };
  }

  name_to_encoding['hz-gb-2312'].getEncoder = function(options) {
    return new HZGB2312Encoder(options);
  };
  name_to_encoding['hz-gb-2312'].getDecoder = function(options) {
    return new HZGB2312Decoder(options);
  };

  //
  // 10. Legacy multi-byte Chinese (traditional) encodings
  //

  // 10.1 big5

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function Big5Decoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ big5_lead = 0x00,
        /** @type {?number} */ big5_pending = null;

    /**
     * @param {ByteInputStream} byte_pointer The byte steram to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      // NOTE: Hack to support emitting two code points
      if (big5_pending !== null) {
        var pending = big5_pending;
        big5_pending = null;
        return pending;
      }
      var bite = byte_pointer.get();
      if (bite === EOF_byte && big5_lead === 0x00) {
        return EOF_code_point;
      }
      if (bite === EOF_byte && big5_lead !== 0x00) {
        big5_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (big5_lead !== 0x00) {
        var lead = big5_lead;
        var pointer = null;
        big5_lead = 0x00;
        var offset = bite < 0x7F ? 0x40 : 0x62;
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0xA1, 0xFE)) {
          pointer = (lead - 0x81) * 157 + (bite - offset);
        }
        if (pointer === 1133) {
          big5_pending = 0x0304;
          return 0x00CA;
        }
        if (pointer === 1135) {
          big5_pending = 0x030C;
          return 0x00CA;
        }
        if (pointer === 1164) {
          big5_pending = 0x0304;
          return 0x00EA;
        }
        if (pointer === 1166) {
          big5_pending = 0x030C;
          return 0x00EA;
        }
        var code_point = (pointer === null) ? null :
            indexCodePointFor(pointer, index('big5'));
        if (pointer === null) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }
      if (inRange(bite, 0x81, 0xFE)) {
        big5_lead = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function Big5Encoder(options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      var pointer = indexPointerFor(code_point, index('big5'));
      if (pointer === null) {
        return encoderError(code_point);
      }
      var lead = div(pointer, 157) + 0x81;
      //if (lead < 0xA1) {
      //  return encoderError(code_point);
      //}
      var trail = pointer % 157;
      var offset = trail < 0x3F ? 0x40 : 0x62;
      return output_byte_stream.emit(lead, trail + offset);
    };
  }

  name_to_encoding['big5'].getEncoder = function(options) {
    return new Big5Encoder(options);
  };
  name_to_encoding['big5'].getDecoder = function(options) {
    return new Big5Decoder(options);
  };


  //
  // 11. Legacy multi-byte Japanese encodings
  //

  // 11.1 euc.jp

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function EUCJPDecoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ eucjp_first = 0x00,
        /** @type {number} */ eucjp_second = 0x00;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte) {
        if (eucjp_first === 0x00 && eucjp_second === 0x00) {
          return EOF_code_point;
        }
        eucjp_first = 0x00;
        eucjp_second = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);

      var lead, code_point;
      if (eucjp_second !== 0x00) {
        lead = eucjp_second;
        eucjp_second = 0x00;
        code_point = null;
        if (inRange(lead, 0xA1, 0xFE) && inRange(bite, 0xA1, 0xFE)) {
          code_point = indexCodePointFor((lead - 0xA1) * 94 + bite - 0xA1,
                                         index('jis0212'));
        }
        if (!inRange(bite, 0xA1, 0xFE)) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (eucjp_first === 0x8E && inRange(bite, 0xA1, 0xDF)) {
        eucjp_first = 0x00;
        return 0xFF61 + bite - 0xA1;
      }
      if (eucjp_first === 0x8F && inRange(bite, 0xA1, 0xFE)) {
        eucjp_first = 0x00;
        eucjp_second = bite;
        return null;
      }
      if (eucjp_first !== 0x00) {
        lead = eucjp_first;
        eucjp_first = 0x00;
        code_point = null;
        if (inRange(lead, 0xA1, 0xFE) && inRange(bite, 0xA1, 0xFE)) {
          code_point = indexCodePointFor((lead - 0xA1) * 94 + bite - 0xA1,
                                         index('jis0208'));
        }
        if (!inRange(bite, 0xA1, 0xFE)) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }
      if (bite === 0x8E || bite === 0x8F || (inRange(bite, 0xA1, 0xFE))) {
        eucjp_first = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function EUCJPEncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      if (code_point === 0x00A5) {
        return output_byte_stream.emit(0x5C);
      }
      if (code_point === 0x203E) {
        return output_byte_stream.emit(0x7E);
      }
      if (inRange(code_point, 0xFF61, 0xFF9F)) {
        return output_byte_stream.emit(0x8E, code_point - 0xFF61 + 0xA1);
      }

      var pointer = indexPointerFor(code_point, index('jis0208'));
      if (pointer === null) {
        return encoderError(code_point);
      }
      var lead = div(pointer, 94) + 0xA1;
      var trail = pointer % 94 + 0xA1;
      return output_byte_stream.emit(lead, trail);
    };
  }

  name_to_encoding['euc-jp'].getEncoder = function(options) {
    return new EUCJPEncoder(options);
  };
  name_to_encoding['euc-jp'].getDecoder = function(options) {
    return new EUCJPDecoder(options);
  };

  // 11.2 iso-2022-jp

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ISO2022JPDecoder(options) {
    var fatal = options.fatal;
    /** @enum */
    var state = {
      ASCII: 0,
      escape_start: 1,
      escape_middle: 2,
      escape_final: 3,
      lead: 4,
      trail: 5,
      Katakana: 6
    };
    var /** @type {number} */ iso2022jp_state = state.ASCII,
        /** @type {boolean} */ iso2022jp_jis0212 = false,
        /** @type {number} */ iso2022jp_lead = 0x00;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite !== EOF_byte) {
        byte_pointer.offset(1);
      }
      switch (iso2022jp_state) {
        default:
        case state.ASCII:
          if (bite === 0x1B) {
            iso2022jp_state = state.escape_start;
            return null;
          }
          if (inRange(bite, 0x00, 0x7F)) {
            return bite;
          }
          if (bite === EOF_byte) {
            return EOF_code_point;
          }
          return decoderError(fatal);

        case state.escape_start:
          if (bite === 0x24 || bite === 0x28) {
            iso2022jp_lead = bite;
            iso2022jp_state = state.escape_middle;
            return null;
          }
          if (bite !== EOF_byte) {
            byte_pointer.offset(-1);
          }
          iso2022jp_state = state.ASCII;
          return decoderError(fatal);

        case state.escape_middle:
          var lead = iso2022jp_lead;
          iso2022jp_lead = 0x00;
          if (lead === 0x24 && (bite === 0x40 || bite === 0x42)) {
            iso2022jp_jis0212 = false;
            iso2022jp_state = state.lead;
            return null;
          }
          if (lead === 0x24 && bite === 0x28) {
            iso2022jp_state = state.escape_final;
            return null;
          }
          if (lead === 0x28 && (bite === 0x42 || bite === 0x4A)) {
            iso2022jp_state = state.ASCII;
            return null;
          }
          if (lead === 0x28 && bite === 0x49) {
            iso2022jp_state = state.Katakana;
            return null;
          }
          if (bite === EOF_byte) {
            byte_pointer.offset(-1);
          } else {
            byte_pointer.offset(-2);
          }
          iso2022jp_state = state.ASCII;
          return decoderError(fatal);

        case state.escape_final:
          if (bite === 0x44) {
            iso2022jp_jis0212 = true;
            iso2022jp_state = state.lead;
            return null;
          }
          if (bite === EOF_byte) {
            byte_pointer.offset(-2);
          } else {
            byte_pointer.offset(-3);
          }
          iso2022jp_state = state.ASCII;
          return decoderError(fatal);

        case state.lead:
          if (bite === 0x0A) {
            iso2022jp_state = state.ASCII;
            return decoderError(fatal, 0x000A);
          }
          if (bite === 0x1B) {
            iso2022jp_state = state.escape_start;
            return null;
          }
          if (bite === EOF_byte) {
            return EOF_code_point;
          }
          iso2022jp_lead = bite;
          iso2022jp_state = state.trail;
          return null;

        case state.trail:
          iso2022jp_state = state.lead;
          if (bite === EOF_byte) {
            return decoderError(fatal);
          }
          var code_point = null;
          var pointer = (iso2022jp_lead - 0x21) * 94 + bite - 0x21;
          if (inRange(iso2022jp_lead, 0x21, 0x7E) &&
              inRange(bite, 0x21, 0x7E)) {
            code_point = (iso2022jp_jis0212 === false) ?
                indexCodePointFor(pointer, index('jis0208')) :
                indexCodePointFor(pointer, index('jis0212'));
          }
          if (code_point === null) {
            return decoderError(fatal);
          }
          return code_point;

        case state.Katakana:
          if (bite === 0x1B) {
            iso2022jp_state = state.escape_start;
            return null;
          }
          if (inRange(bite, 0x21, 0x5F)) {
            return 0xFF61 + bite - 0x21;
          }
          if (bite === EOF_byte) {
            return EOF_code_point;
          }
          return decoderError(fatal);
      }
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ISO2022JPEncoder(options) {
    var fatal = options.fatal;
    /** @enum */
    var state = {
      ASCII: 0,
      lead: 1,
      Katakana: 2
    };
    var /** @type {number} */ iso2022jp_state = state.ASCII;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if ((inRange(code_point, 0x0000, 0x007F) ||
           code_point === 0x00A5 || code_point === 0x203E) &&
          iso2022jp_state !== state.ASCII) {
        code_point_pointer.offset(-1);
        iso2022jp_state = state.ASCII;
        return output_byte_stream.emit(0x1B, 0x28, 0x42);
      }
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      if (code_point === 0x00A5) {
        return output_byte_stream.emit(0x5C);
      }
      if (code_point === 0x203E) {
        return output_byte_stream.emit(0x7E);
      }
      if (inRange(code_point, 0xFF61, 0xFF9F) &&
          iso2022jp_state !== state.Katakana) {
        code_point_pointer.offset(-1);
        iso2022jp_state = state.Katakana;
        return output_byte_stream.emit(0x1B, 0x28, 0x49);
      }
      if (inRange(code_point, 0xFF61, 0xFF9F)) {
        return output_byte_stream.emit(code_point - 0xFF61 - 0x21);
      }
      if (iso2022jp_state !== state.lead) {
        code_point_pointer.offset(-1);
        iso2022jp_state = state.lead;
        return output_byte_stream.emit(0x1B, 0x24, 0x42);
      }
      var pointer = indexPointerFor(code_point, index('jis0208'));
      if (pointer === null) {
        return encoderError(code_point);
      }
      var lead = div(pointer, 94) + 0x21;
      var trail = pointer % 94 + 0x21;
      return output_byte_stream.emit(lead, trail);
    };
  }

  name_to_encoding['iso-2022-jp'].getEncoder = function(options) {
    return new ISO2022JPEncoder(options);
  };
  name_to_encoding['iso-2022-jp'].getDecoder = function(options) {
    return new ISO2022JPDecoder(options);
  };

  // 11.3 shift_jis

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ShiftJISDecoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ shiftjis_lead = 0x00;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte && shiftjis_lead === 0x00) {
        return EOF_code_point;
      }
      if (bite === EOF_byte && shiftjis_lead !== 0x00) {
        shiftjis_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (shiftjis_lead !== 0x00) {
        var lead = shiftjis_lead;
        shiftjis_lead = 0x00;
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFC)) {
          var offset = (bite < 0x7F) ? 0x40 : 0x41;
          var lead_offset = (lead < 0xA0) ? 0x81 : 0xC1;
          var code_point = indexCodePointFor((lead - lead_offset) * 188 +
                                             bite - offset, index('jis0208'));
          if (code_point === null) {
            return decoderError(fatal);
          }
          return code_point;
        }
        byte_pointer.offset(-1);
        return decoderError(fatal);
      }
      if (inRange(bite, 0x00, 0x80)) {
        return bite;
      }
      if (inRange(bite, 0xA1, 0xDF)) {
        return 0xFF61 + bite - 0xA1;
      }
      if (inRange(bite, 0x81, 0x9F) || inRange(bite, 0xE0, 0xFC)) {
        shiftjis_lead = bite;
        return null;
      }
      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function ShiftJISEncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x0080)) {
        return output_byte_stream.emit(code_point);
      }
      if (code_point === 0x00A5) {
        return output_byte_stream.emit(0x5C);
      }
      if (code_point === 0x203E) {
        return output_byte_stream.emit(0x7E);
      }
      if (inRange(code_point, 0xFF61, 0xFF9F)) {
        return output_byte_stream.emit(code_point - 0xFF61 + 0xA1);
      }
      var pointer = indexPointerFor(code_point, index('jis0208'));
      if (pointer === null) {
        return encoderError(code_point);
      }
      var lead = div(pointer, 188);
      var lead_offset = lead < 0x1F ? 0x81 : 0xC1;
      var trail = pointer % 188;
      var offset = trail < 0x3F ? 0x40 : 0x41;
      return output_byte_stream.emit(lead + lead_offset, trail + offset);
    };
  }

  name_to_encoding['shift_jis'].getEncoder = function(options) {
    return new ShiftJISEncoder(options);
  };
  name_to_encoding['shift_jis'].getDecoder = function(options) {
    return new ShiftJISDecoder(options);
  };

  //
  // 12. Legacy multi-byte Korean encodings
  //

  // 12.1 euc-kr

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function EUCKRDecoder(options) {
    var fatal = options.fatal;
    var /** @type {number} */ euckr_lead = 0x00;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte && euckr_lead === 0) {
        return EOF_code_point;
      }
      if (bite === EOF_byte && euckr_lead !== 0) {
        euckr_lead = 0x00;
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (euckr_lead !== 0x00) {
        var lead = euckr_lead;
        var pointer = null;
        euckr_lead = 0x00;

        if (inRange(lead, 0x81, 0xC6)) {
          var temp = (26 + 26 + 126) * (lead - 0x81);
          if (inRange(bite, 0x41, 0x5A)) {
            pointer = temp + bite - 0x41;
          } else if (inRange(bite, 0x61, 0x7A)) {
            pointer = temp + 26 + bite - 0x61;
          } else if (inRange(bite, 0x81, 0xFE)) {
            pointer = temp + 26 + 26 + bite - 0x81;
          }
        }

        if (inRange(lead, 0xC7, 0xFD) && inRange(bite, 0xA1, 0xFE)) {
          pointer = (26 + 26 + 126) * (0xC7 - 0x81) + (lead - 0xC7) * 94 +
              (bite - 0xA1);
        }

        var code_point = (pointer === null) ? null :
            indexCodePointFor(pointer, index('euc-kr'));
        if (pointer === null) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }

      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }

      if (inRange(bite, 0x81, 0xFD)) {
        euckr_lead = bite;
        return null;
      }

      return decoderError(fatal);
    };
  }

  /**
   * @constructor
   * @param {{fatal: boolean}} options
   */
  function EUCKREncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0x0000, 0x007F)) {
        return output_byte_stream.emit(code_point);
      }
      var pointer = indexPointerFor(code_point, index('euc-kr'));
      if (pointer === null) {
        return encoderError(code_point);
      }
      var lead, trail;
      if (pointer < ((26 + 26 + 126) * (0xC7 - 0x81))) {
        lead = div(pointer, (26 + 26 + 126)) + 0x81;
        trail = pointer % (26 + 26 + 126);
        var offset = trail < 26 ? 0x41 : trail < 26 + 26 ? 0x47 : 0x4D;
        return output_byte_stream.emit(lead, trail + offset);
      }
      pointer = pointer - (26 + 26 + 126) * (0xC7 - 0x81);
      lead = div(pointer, 94) + 0xC7;
      trail = pointer % 94 + 0xA1;
      return output_byte_stream.emit(lead, trail);
    };
  }

  name_to_encoding['euc-kr'].getEncoder = function(options) {
    return new EUCKREncoder(options);
  };
  name_to_encoding['euc-kr'].getDecoder = function(options) {
    return new EUCKRDecoder(options);
  };


  //
  // 13. Legacy utf-16 encodings
  //

  // 13.1 utf-16

  /**
   * @constructor
   * @param {boolean} utf16_be True if big-endian, false if little-endian.
   * @param {{fatal: boolean}} options
   */
  function UTF16Decoder(utf16_be, options) {
    var fatal = options.fatal;
    var /** @type {?number} */ utf16_lead_byte = null,
        /** @type {?number} */ utf16_lead_surrogate = null;
    /**
     * @param {ByteInputStream} byte_pointer The byte stream to decode.
     * @return {?number} The next code point decoded, or null if not enough
     *     data exists in the input stream to decode a complete code point.
     */
    this.decode = function(byte_pointer) {
      var bite = byte_pointer.get();
      if (bite === EOF_byte && utf16_lead_byte === null &&
          utf16_lead_surrogate === null) {
        return EOF_code_point;
      }
      if (bite === EOF_byte && (utf16_lead_byte !== null ||
                                utf16_lead_surrogate !== null)) {
        return decoderError(fatal);
      }
      byte_pointer.offset(1);
      if (utf16_lead_byte === null) {
        utf16_lead_byte = bite;
        return null;
      }
      var code_point;
      if (utf16_be) {
        code_point = (utf16_lead_byte << 8) + bite;
      } else {
        code_point = (bite << 8) + utf16_lead_byte;
      }
      utf16_lead_byte = null;
      if (utf16_lead_surrogate !== null) {
        var lead_surrogate = utf16_lead_surrogate;
        utf16_lead_surrogate = null;
        if (inRange(code_point, 0xDC00, 0xDFFF)) {
          return 0x10000 + (lead_surrogate - 0xD800) * 0x400 +
              (code_point - 0xDC00);
        }
        byte_pointer.offset(-2);
        return decoderError(fatal);
      }
      if (inRange(code_point, 0xD800, 0xDBFF)) {
        utf16_lead_surrogate = code_point;
        return null;
      }
      if (inRange(code_point, 0xDC00, 0xDFFF)) {
        return decoderError(fatal);
      }
      return code_point;
    };
  }

  /**
   * @constructor
   * @param {boolean} utf16_be True if big-endian, false if little-endian.
   * @param {{fatal: boolean}} options
   */
  function UTF16Encoder(utf16_be, options) {
    var fatal = options.fatal;
    /**
     * @param {ByteOutputStream} output_byte_stream Output byte stream.
     * @param {CodePointInputStream} code_point_pointer Input stream.
     * @return {number} The last byte emitted.
     */
    this.encode = function(output_byte_stream, code_point_pointer) {
      function convert_to_bytes(code_unit) {
        var byte1 = code_unit >> 8;
        var byte2 = code_unit & 0x00FF;
        if (utf16_be) {
          return output_byte_stream.emit(byte1, byte2);
        }
        return output_byte_stream.emit(byte2, byte1);
      }
      var code_point = code_point_pointer.get();
      if (code_point === EOF_code_point) {
        return EOF_byte;
      }
      code_point_pointer.offset(1);
      if (inRange(code_point, 0xD800, 0xDFFF)) {
        encoderError(code_point);
      }
      if (code_point <= 0xFFFF) {
        return convert_to_bytes(code_point);
      }
      var lead = div((code_point - 0x10000), 0x400) + 0xD800;
      var trail = ((code_point - 0x10000) % 0x400) + 0xDC00;
      convert_to_bytes(lead);
      return convert_to_bytes(trail);
    };
  }

  name_to_encoding['utf-16le'].getEncoder = function(options) {
    return new UTF16Encoder(false, options);
  };
  name_to_encoding['utf-16le'].getDecoder = function(options) {
    return new UTF16Decoder(false, options);
  };

  // 13.2 utf-16be
  name_to_encoding['utf-16be'].getEncoder = function(options) {
    return new UTF16Encoder(true, options);
  };
  name_to_encoding['utf-16be'].getDecoder = function(options) {
    return new UTF16Decoder(true, options);
  };


  // NOTE: currently unused
  /**
   * @param {string} label The encoding label.
   * @param {ByteInputStream} input_stream The byte stream to test.
   */
  function detectEncoding(label, input_stream) {
    if (input_stream.match([0xFF, 0xFE])) {
      input_stream.offset(2);
      return 'utf-16le';
    }
    if (input_stream.match([0xFE, 0xFF])) {
      input_stream.offset(2);
      return 'utf-16be';
    }
    if (input_stream.match([0xEF, 0xBB, 0xBF])) {
      input_stream.offset(3);
      return 'utf-8';
    }
    return label;
  }

  //
  // Implementation of Text Encoding Web API
  //

  /** @const */ var DEFAULT_ENCODING = 'utf-8';

  /**
   * @constructor
   * @param {string=} opt_encoding The label of the encoding;
   *     defaults to 'utf-8'.
   * @param {{fatal: boolean}=} options
   */
  function TextEncoder(opt_encoding, options) {
    if (!(this instanceof TextEncoder)) {
      throw new TypeError('Constructor cannot be called as a function');
    }
    opt_encoding = opt_encoding ? String(opt_encoding) : DEFAULT_ENCODING;
    options = Object(options);
    /** @private */
    this._encoding = getEncoding(opt_encoding);
    if (this._encoding === null || (this._encoding.name !== 'utf-8' &&
                                    this._encoding.name !== 'utf-16le' &&
                                    this._encoding.name !== 'utf-16be'))
      throw new TypeError('Unknown encoding: ' + opt_encoding);
    /** @private @type {boolean} */
    this._streaming = false;
    /** @private */
    this._encoder = null;
    /** @private @type {{fatal: boolean}=} */
    this._options = { fatal: Boolean(options.fatal) };

    if (Object.defineProperty) {
      Object.defineProperty(
          this, 'encoding',
          { get: function() { return this._encoding.name; } });
    } else {
      this.encoding = this._encoding.name;
    }

    return this;
  }

  TextEncoder.prototype = {
    /**
     * @param {string=} opt_string The string to encode.
     * @param {{stream: boolean}=} options
     */
    encode: function encode(opt_string, options) {
      opt_string = opt_string ? String(opt_string) : '';
      options = Object(options);
      // TODO: any options?
      if (!this._streaming) {
        this._encoder = this._encoding.getEncoder(this._options);
      }
      this._streaming = Boolean(options.stream);

      var bytes = [];
      var output_stream = new ByteOutputStream(bytes);
      var input_stream = new CodePointInputStream(opt_string);
      while (input_stream.get() !== EOF_code_point) {
        this._encoder.encode(output_stream, input_stream);
      }
      if (!this._streaming) {
        var last_byte;
        do {
          last_byte = this._encoder.encode(output_stream, input_stream);
        } while (last_byte !== EOF_byte);
        this._encoder = null;
      }
      return new Uint8Array(bytes);
    }
  };


  /**
   * @constructor
   * @param {string=} opt_encoding The label of the encoding;
   *     defaults to 'utf-8'.
   * @param {{fatal: boolean}=} options
   */
  function TextDecoder(opt_encoding, options) {
    if (!(this instanceof TextDecoder)) {
      throw new TypeError('Constructor cannot be called as a function');
    }
    opt_encoding = opt_encoding ? String(opt_encoding) : DEFAULT_ENCODING;
    options = Object(options);
    /** @private */
    this._encoding = getEncoding(opt_encoding);
    if (this._encoding === null)
      throw new TypeError('Unknown encoding: ' + opt_encoding);

    /** @private @type {boolean} */
    this._streaming = false;
    /** @private */
    this._decoder = null;
    /** @private @type {{fatal: boolean}=} */
    this._options = { fatal: Boolean(options.fatal) };

    if (Object.defineProperty) {
      Object.defineProperty(
          this, 'encoding',
          { get: function() { return this._encoding.name; } });
    } else {
      this.encoding = this._encoding.name;
    }

    return this;
  }

  // TODO: Issue if input byte stream is offset by decoder
  // TODO: BOM detection will not work if stream header spans multiple calls
  // (last N bytes of previous stream may need to be retained?)
  TextDecoder.prototype = {
    /**
     * @param {ArrayBufferView=} opt_view The buffer of bytes to decode.
     * @param {{stream: boolean}=} options
     */
    decode: function decode(opt_view, options) {
      if (opt_view && !('buffer' in opt_view && 'byteOffset' in opt_view &&
                        'byteLength' in opt_view)) {
        throw new TypeError('Expected ArrayBufferView');
      } else if (!opt_view) {
        opt_view = new Uint8Array(0);
      }
      options = Object(options);

      if (!this._streaming) {
        this._decoder = this._encoding.getDecoder(this._options);
        this._BOMseen = false;
      }
      this._streaming = Boolean(options.stream);

      var bytes = new Uint8Array(opt_view.buffer,
                                 opt_view.byteOffset,
                                 opt_view.byteLength);
      var input_stream = new ByteInputStream(bytes);

      var output_stream = new CodePointOutputStream(), code_point;
      while (input_stream.get() !== EOF_byte) {
        code_point = this._decoder.decode(input_stream);
        if (code_point !== null && code_point !== EOF_code_point) {
          output_stream.emit(code_point);
        }
      }
      if (!this._streaming) {
        do {
          code_point = this._decoder.decode(input_stream);
          if (code_point !== null && code_point !== EOF_code_point) {
            output_stream.emit(code_point);
          }
        } while (code_point !== EOF_code_point &&
                 input_stream.get() != EOF_byte);
        this._decoder = null;
      }

      var result = output_stream.string();
      if (!this._BOMseen && result.length) {
        this._BOMseen = true;
        if (['utf-8', 'utf-16le', 'utf-16be'].indexOf(this.encoding) !== -1 &&
           result.charCodeAt(0) === 0xFEFF) {
          result = result.substring(1);
        }
      }

      return result;
    }
  };

  global['TextEncoder'] = global['TextEncoder'] || TextEncoder;
  global['TextDecoder'] = global['TextDecoder'] || TextDecoder;
}(this));

define("encoding", ["encoding-indexes-shim"], function(){});

define('src/adapters/crypto',['require','crypto-js/rollups/aes','encoding'],function(require) {

  // AES encryption, see http://code.google.com/p/crypto-js/#AES
  require("crypto-js/rollups/aes");

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


  // It is up to the app using this wrapper how the passphrase is acquired, probably by
  // prompting the user to enter it when the file system is being opened.
  function CryptoAdapter(passphrase, provider) {
    this.provider = provider;

    // Cache cipher algorithm we'll use in encrypt/decrypt
    var cipher = CryptoJS.AES;

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
});

define('src/adapters/adapters',['require','src/adapters/zlib','src/adapters/crypto'],function(require) {

  return {
    Compression: require('src/adapters/zlib'),
    Encryption: require('src/adapters/crypto')
  };

});

define('src/shell/environment',['require','src/constants'],function(require) {

  var defaults = require('src/constants').ENVIRONMENT;

  function Environment(env) {
    env = env || {};
    env.TMP = env.TMP || defaults.TMP;
    env.PATH = env.PATH || defaults.PATH;

    this.get = function(name) {
      return env[name];
    };

    this.set = function(name, value) {
      env[name] = value;
    };
  }

  return Environment;
});

define('src/network',['require'],function(require) {
  // Pull in node's request module if possible/needed
  if (typeof XMLHttpRequest === 'undefined') {
    // This is a stupid workaround for the fact that
    // the r.js optimizer checks every require() call
    // during optimization and throws an error if it
    // can't find the module.
    //
    // This is only an issue with our browser build
    // using `almond` (https://github.com/jrburke/almond)
    // which doesn't fallback to node's require when we
    // need it to.
    var node_req = require;
    var request = node_req('request');
  }

  function browserDownload(uri, callback) {
    var query = new XMLHttpRequest();
    query.onload = function() {
      var err = query.status != 200 ? { message: query.statusText, code: query.status } : null,
          data = err ? null : new Uint8Array(query.response);

      callback(err, data);
    };
    query.open("GET", uri);
    if("withCredentials" in query) {
      query.withCredentials = true;
    }

    query.responseType = "arraybuffer";
    query.send();
  }

  function nodeDownload(uri, callback) {
    request({
      url: uri,
      method: "GET",
      encoding: null
    }, function(err, msg, body) {
      var data = null,
          arrayBuffer,
          statusCode,
          arrayLength = body && body.length,
          error;

      msg = msg || null;
      statusCode = msg && msg.statusCode;

      error = statusCode != 200 ? { message: err || 'Not found!', code: statusCode } : null;

      arrayBuffer = arrayLength && new ArrayBuffer(arrayLength);

      // Convert buffer to Uint8Array
      if (arrayBuffer && (statusCode == 200)) {
        data = new Uint8Array(arrayBuffer);
        for (var i = 0; i < body.length; ++i) {
          data[i] = body[i];
        }
      }

      callback(error, data);
    });
  }

  return {
    download: function(uri, callback) {
      if (!uri) {
        throw('Uri required!');
      }

      if (!callback) {
        throw('Callback required');
      }

      if (typeof XMLHttpRequest === "undefined") {
        nodeDownload(uri, callback);
      } else {
        browserDownload(uri, callback);
      }
    }
  };
});

/* jshint evil:true */
define('src/shell/shell',['require','src/path','src/errors','src/shell/environment','async','src/network'],function(require) {

  var Path = require('src/path');
  var Errors = require('src/errors');
  var Environment = require('src/shell/environment');
  var async = require('async');
  var Network = require('src/network');

  function Shell(fs, options) {
    options = options || {};

    var env = new Environment(options.env);
    var cwd = '/';

    /**
     * The bound FileSystem (cannot be changed)
     */
    Object.defineProperty(this, 'fs', {
      get: function() { return fs; },
      enumerable: true
    });

    /**
     * The shell's environment (e.g., for things like
     * path, tmp, and other env vars). Use env.get()
     * and env.set() to work with variables.
     */
    Object.defineProperty(this, 'env', {
      get: function() { return env; },
      enumerable: true
    });

    /**
     * Change the current working directory. We
     * include `cd` on the `this` vs. proto so that
     * we can access cwd without exposing it externally.
     */
    this.cd = function(path, callback) {
      path = Path.resolve(this.cwd, path);
      // Make sure the path actually exists, and is a dir
      fs.stat(path, function(err, stats) {
        if(err) {
          callback(new Errors.ENOTDIR());
          return;
        }
        if(stats.type === 'DIRECTORY') {
          cwd = path;
          callback();
        } else {
          callback(new Errors.ENOTDIR());
        }
      });
    };

    /**
     * Get the current working directory (changed with `cd()`)
     */
    this.pwd = function() {
      return cwd;
    };
  }

  /**
   * Execute the .js command located at `path`. Such commands
   * should assume the existence of 3 arguments, which will be
   * defined at runtime:
   *
   *   * fs - the current shell's bound filesystem object
   *   * args - a list of arguments for the command, or an empty list if none
   *   * callback - a callback function(error, result) to call when done.
   *
   * The .js command's contents should be the body of a function
   * that looks like this:
   *
   * function(fs, args, callback) {
   *   // .js code here
   * }
   */
  Shell.prototype.exec = function(path, args, callback) {
    var fs = this.fs;
    if(typeof args === 'function') {
      callback = args;
      args = [];
    }
    args = args || [];
    callback = callback || function(){};
    path = Path.resolve(this.cwd, path);

    fs.readFile(path, "utf8", function(error, data) {
      if(error) {
        callback(error);
        return;
      }
      try {
        var cmd = new Function('fs', 'args', 'callback', data);
        cmd(fs, args, callback);
      } catch(e) {
        callback(e);
      }
    });
  };

  /**
   * Create a file if it does not exist, or update access and
   * modified times if it does. Valid options include:
   *
   *  * updateOnly - whether to create the file if missing (defaults to false)
   *  * date - use the provided Date value instead of current date/time
   */
  Shell.prototype.touch = function(path, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};
    path = Path.resolve(this.cwd, path);

    function createFile(path) {
      fs.writeFile(path, '', callback);
    }

    function updateTimes(path) {
      var now = Date.now();
      var atime = options.date || now;
      var mtime = options.date || now;

      fs.utimes(path, atime, mtime, callback);
    }

    fs.stat(path, function(error, stats) {
      if(error) {
        if(options.updateOnly === true) {
          callback();
        } else {
          createFile(path);
        }
      } else {
        updateTimes(path);
      }
    });
  };

  /**
   * Concatenate multiple files into a single String, with each
   * file separated by a newline. The `files` argument should
   * be a String (path to single file) or an Array of Strings
   * (multiple file paths).
   */
  Shell.prototype.cat = function(files, callback) {
    var fs = this.fs;
    var all = '';
    callback = callback || function(){};

    if(!files) {
      callback(new Errors.EINVAL("Missing files argument"));
      return;
    }

    files = typeof files === 'string' ? [ files ] : files;

    function append(item, callback) {
      var filename = Path.resolve(this.cwd, item);
      fs.readFile(filename, 'utf8', function(error, data) {
        if(error) {
          callback(error);
          return;
        }
        all += data + '\n';
        callback();
      });
    }

    async.eachSeries(files, append, function(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, all.replace(/\n$/, ''));
      }
    });
  };

  /**
   * Get the listing of a directory, returning an array of
   * file entries in the following form:
   *
   * {
   *   path: <String> the basename of the directory entry
   *   links: <Number> the number of links to the entry
   *   size: <Number> the size in bytes of the entry
   *   modified: <Number> the last modified date/time
   *   type: <String> the type of the entry
   *   contents: <Array> an optional array of child entries
   * }
   *
   * By default ls() gives a shallow listing. If you want
   * to follow directories as they are encountered, use
   * the `recursive=true` option.
   */
  Shell.prototype.ls = function(dir, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!dir) {
      callback(new Errors.EINVAL("Missing dir argument"));
      return;
    }

    function list(path, callback) {
      var pathname = Path.resolve(this.cwd, path);
      var result = [];

      fs.readdir(pathname, function(error, entries) {
        if(error) {
          callback(error);
          return;
        }

        function getDirEntry(name, callback) {
          name = Path.join(pathname, name);
          fs.stat(name, function(error, stats) {
            if(error) {
              callback(error);
              return;
            }
            var entry = {
              path: Path.basename(name),
              links: stats.nlinks,
              size: stats.size,
              modified: stats.mtime,
              type: stats.type
            };

            if(options.recursive && stats.type === 'DIRECTORY') {
              list(Path.join(pathname, entry.path), function(error, items) {
                if(error) {
                  callback(error);
                  return;
                }
                entry.contents = items;
                result.push(entry);
                callback();
              });
            } else {
              result.push(entry);
              callback();
            }
          });
        }

        async.each(entries, getDirEntry, function(error) {
          callback(error, result);
        });
      });
    }

    list(dir, callback);
  };

  /**
   * Removes the file or directory at `path`. If `path` is a file
   * it will be removed. If `path` is a directory, it will be
   * removed if it is empty, otherwise the callback will receive
   * an error. In order to remove non-empty directories, use the
   * `recursive=true` option.
   */
  Shell.prototype.rm = function(path, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!path) {
      callback(new Errors.EINVAL("Missing path argument"));
      return;
    }

    function remove(pathname, callback) {
      pathname = Path.resolve(this.cwd, pathname);
      fs.stat(pathname, function(error, stats) {
        if(error) {
          callback(error);
          return;
        }

        // If this is a file, delete it and we're done
        if(stats.type === 'FILE') {
          fs.unlink(pathname, callback);
          return;
        }

        // If it's a dir, check if it's empty
        fs.readdir(pathname, function(error, entries) {
          if(error) {
            callback(error);
            return;
          }

          // If dir is empty, delete it and we're done
          if(entries.length === 0) {
            fs.rmdir(pathname, callback);
            return;
          }

          // If not, see if we're allowed to delete recursively
          if(!options.recursive) {
            callback(new Errors.ENOTEMPTY());
            return;
          }

          // Remove each dir entry recursively, then delete the dir.
          entries = entries.map(function(filename) {
            // Root dir entries absolutely
            return Path.join(pathname, filename);
          });
          async.each(entries, remove, function(error) {
            if(error) {
              callback(error);
              return;
            }
            fs.rmdir(pathname, callback);
          });
        });
      });
    }

    remove(path, callback);
  };

  /**
   * Gets the path to the temporary directory, creating it if not
   * present. The directory used is the one specified in
   * env.TMP. The callback receives (error, tempDirName).
   */
  Shell.prototype.tempDir = function(callback) {
    var fs = this.fs;
    var tmp = this.env.get('TMP');
    callback = callback || function(){};

    // Try and create it, and it will either work or fail
    // but either way it's now there.
    fs.mkdir(tmp, function(err) {
      callback(null, tmp);
    });
  };

  /**
   * Recursively creates the directory at `path`. If the parent
   * of `path` does not exist, it will be created.
   * Based off EnsureDir by Sam X. Xu
   * https://www.npmjs.org/package/ensureDir
   * MIT License
   */
  Shell.prototype.mkdirp = function(path, callback) {
    var fs = this.fs;
    callback = callback || function(){};

    if(!path) {
      callback(new Errors.EINVAL("Missing path argument"));
      return;
    }
    else if (path === '/') {
      callback();
      return;
    }
    function _mkdirp(path, callback) {
      fs.stat(path, function (err, stat) {
        if(stat) {
          if(stat.isDirectory()) {
            callback();
            return;
          }
          else if (stat.isFile()) {
            callback(new Errors.ENOTDIR());
            return;
          }
        }
        else if (err && err.code !== 'ENOENT') {
          callback(err);
          return;
        }
        else {
          var parent = Path.dirname(path);
          if(parent === '/') {
            fs.mkdir(path, function (err) {
              if (err && err.code != 'EEXIST') {
                callback(err);
                return;
              }
              callback();
              return;
            });
          }
          else {
            _mkdirp(parent, function (err) {
              if (err) return callback(err);
              fs.mkdir(path, function (err) {
                if (err && err.code != 'EEXIST') {
                  callback(err);
                  return;
                }
                callback();
                return;
              });
            });
          }
        }

      });
    }

    _mkdirp(path, callback);
  };

  /**
   * Downloads the file at `url` and saves it to the filesystem.
   * The file is saved to a file named with the current date/time
   * unless the `options.filename` is present, in which case that
   * filename is used instead. The callback receives (error, path).
   */
  Shell.prototype.wget = function(url, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!url) {
      callback(new Errors.EINVAL('missing url argument'));
      return;
    }

    // Grab whatever is after the last / (assuming there is one) and
    // remove any non-filename type chars(i.e., : and /). Like the real
    // wget, we leave query string or hash portions in tact.
    var path = options.filename || url.replace(/[:/]/, '').split('/').pop();
    path = Path.resolve(fs.cwd, path);

    function onerror() {
      callback(new Error('unable to get resource'));
    }

    Network.download('get', url, function(err, data, statusCode) {
      if (err || !data || statusCode != 200) {
        return onerror();
      }

      fs.writeFile(path, data, function(err) {
        if(err) {
          callback(err);
        } else {
          callback(null, path);
        }
      });
    });
  };

  return Shell;

});

define('eventemitter',['require'],function(require) {

  // Based on https://github.com/diy/intercom.js/blob/master/lib/events.js
  // Copyright 2012 DIY Co Apache License, Version 2.0
  // http://www.apache.org/licenses/LICENSE-2.0

  function removeItem(item, array) {
    for (var i = array.length - 1; i >= 0; i--) {
      if (array[i] === item) {
        array.splice(i, 1);
      }
    }
    return array;
  }

  var EventEmitter = function() {};

  EventEmitter.createInterface = function(space) {
    var methods = {};

    methods.on = function(name, fn) {
      if (typeof this[space] === 'undefined') {
        this[space] = {};
      }
      if (!this[space].hasOwnProperty(name)) {
        this[space][name] = [];
      }
      this[space][name].push(fn);
    };

    methods.off = function(name, fn) {
      if (typeof this[space] === 'undefined') return;
      if (this[space].hasOwnProperty(name)) {
        removeItem(fn, this[space][name]);
      }
    };

    methods.trigger = function(name) {
      if (typeof this[space] !== 'undefined' && this[space].hasOwnProperty(name)) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < this[space][name].length; i++) {
          this[space][name][i].apply(this[space][name][i], args);
        }
      }
    };

    methods.removeAllListeners = function(name) {
      if (typeof this[space] === 'undefined') return;
      var self = this;
      self[space][name].forEach(function(fn) {
        self.off(name, fn);
      });
    };

    return methods;
  };

  var pvt = EventEmitter.createInterface('_handlers');
  EventEmitter.prototype._on = pvt.on;
  EventEmitter.prototype._off = pvt.off;
  EventEmitter.prototype._trigger = pvt.trigger;

  var pub = EventEmitter.createInterface('handlers');
  EventEmitter.prototype.on = function() {
    pub.on.apply(this, arguments);
    Array.prototype.unshift.call(arguments, 'on');
    this._trigger.apply(this, arguments);
  };
  EventEmitter.prototype.off = pub.off;
  EventEmitter.prototype.trigger = pub.trigger;
  EventEmitter.prototype.removeAllListeners = pub.removeAllListeners;

  return EventEmitter;
});

define('intercom',['require','eventemitter','src/shared'],function(require) {

  // Based on https://github.com/diy/intercom.js/blob/master/lib/intercom.js
  // Copyright 2012 DIY Co Apache License, Version 2.0
  // http://www.apache.org/licenses/LICENSE-2.0

  var EventEmitter = require('eventemitter');
  var guid = require('src/shared').guid;

  function throttle(delay, fn) {
    var last = 0;
    return function() {
      var now = Date.now();
      if (now - last > delay) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  function extend(a, b) {
    if (typeof a === 'undefined' || !a) { a = {}; }
    if (typeof b === 'object') {
      for (var key in b) {
        if (b.hasOwnProperty(key)) {
          a[key] = b[key];
        }
      }
    }
    return a;
  }

  var localStorage = (function(window) {
    if (typeof window === 'undefined' ||
        typeof window.localStorage === 'undefined') {
      return {
        getItem : function() {},
        setItem : function() {},
        removeItem : function() {}
      };
    }
    return window.localStorage;
  }(this));

  function Intercom() {
    var self = this;
    var now = Date.now();

    this.origin         = guid();
    this.lastMessage    = now;
    this.receivedIDs    = {};
    this.previousValues = {};

    var storageHandler = function() {
      self._onStorageEvent.apply(self, arguments);
    };

    // If we're in node.js, skip event registration
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (document.attachEvent) {
      document.attachEvent('onstorage', storageHandler);
    } else {
      window.addEventListener('storage', storageHandler, false);
    }
  }

  Intercom.prototype._transaction = function(fn) {
    var TIMEOUT   = 1000;
    var WAIT      = 20;
    var self      = this;
    var executed  = false;
    var listening = false;
    var waitTimer = null;

    function lock() {
      if (executed) {
        return;
      }

      var now = Date.now();
      var activeLock = localStorage.getItem(INDEX_LOCK)|0;
      if (activeLock && now - activeLock < TIMEOUT) {
        if (!listening) {
          self._on('storage', lock);
          listening = true;
        }
        waitTimer = setTimeout(lock, WAIT);
        return;
      }
      executed = true;
      localStorage.setItem(INDEX_LOCK, now);

      fn();
      unlock();
    }

    function unlock() {
      if (listening) {
        self._off('storage', lock);
      }
      if (waitTimer) {
        clearTimeout(waitTimer);
      }
      localStorage.removeItem(INDEX_LOCK);
    }

    lock();
  };

  Intercom.prototype._cleanup_emit = throttle(100, function() {
    var self = this;

    self._transaction(function() {
      var now = Date.now();
      var threshold = now - THRESHOLD_TTL_EMIT;
      var changed = 0;
      var messages;

      try {
        messages = JSON.parse(localStorage.getItem(INDEX_EMIT) || '[]');
      } catch(e) {
        messages = [];
      }
      for (var i = messages.length - 1; i >= 0; i--) {
        if (messages[i].timestamp < threshold) {
          messages.splice(i, 1);
          changed++;
        }
      }
      if (changed > 0) {
        localStorage.setItem(INDEX_EMIT, JSON.stringify(messages));
      }
    });
  });

  Intercom.prototype._cleanup_once = throttle(100, function() {
    var self = this;

    self._transaction(function() {
      var timestamp, ttl, key;
      var table;
      var now  = Date.now();
      var changed = 0;

      try {
        table = JSON.parse(localStorage.getItem(INDEX_ONCE) || '{}');
      } catch(e) {
        table = {};
      }
      for (key in table) {
        if (self._once_expired(key, table)) {
          delete table[key];
          changed++;
        }
      }

      if (changed > 0) {
        localStorage.setItem(INDEX_ONCE, JSON.stringify(table));
      }
    });
  });

  Intercom.prototype._once_expired = function(key, table) {
    if (!table) {
      return true;
    }
    if (!table.hasOwnProperty(key)) {
      return true;
    }
    if (typeof table[key] !== 'object') {
      return true;
    }

    var ttl = table[key].ttl || THRESHOLD_TTL_ONCE;
    var now = Date.now();
    var timestamp = table[key].timestamp;
    return timestamp < now - ttl;
  };

  Intercom.prototype._localStorageChanged = function(event, field) {
    if (event && event.key) {
      return event.key === field;
    }

    var currentValue = localStorage.getItem(field);
    if (currentValue === this.previousValues[field]) {
      return false;
    }
    this.previousValues[field] = currentValue;
    return true;
  };

  Intercom.prototype._onStorageEvent = function(event) {
    event = event || window.event;
    var self = this;

    if (this._localStorageChanged(event, INDEX_EMIT)) {
      this._transaction(function() {
        var now = Date.now();
        var data = localStorage.getItem(INDEX_EMIT);
        var messages;

        try {
          messages = JSON.parse(data || '[]');
        } catch(e) {
          messages = [];
        }
        for (var i = 0; i < messages.length; i++) {
          if (messages[i].origin === self.origin) continue;
          if (messages[i].timestamp < self.lastMessage) continue;
          if (messages[i].id) {
            if (self.receivedIDs.hasOwnProperty(messages[i].id)) continue;
            self.receivedIDs[messages[i].id] = true;
          }
          self.trigger(messages[i].name, messages[i].payload);
        }
        self.lastMessage = now;
      });
    }

    this._trigger('storage', event);
  };

  Intercom.prototype._emit = function(name, message, id) {
    id = (typeof id === 'string' || typeof id === 'number') ? String(id) : null;
    if (id && id.length) {
      if (this.receivedIDs.hasOwnProperty(id)) return;
      this.receivedIDs[id] = true;
    }

    var packet = {
      id        : id,
      name      : name,
      origin    : this.origin,
      timestamp : Date.now(),
      payload   : message
    };

    var self = this;
    this._transaction(function() {
      var data = localStorage.getItem(INDEX_EMIT) || '[]';
      var delimiter = (data === '[]') ? '' : ',';
      data = [data.substring(0, data.length - 1), delimiter, JSON.stringify(packet), ']'].join('');
      localStorage.setItem(INDEX_EMIT, data);
      self.trigger(name, message);

      setTimeout(function() {
        self._cleanup_emit();
      }, 50);
    });
  };

  Intercom.prototype.emit = function(name, message) {
    this._emit.apply(this, arguments);
    this._trigger('emit', name, message);
  };

  Intercom.prototype.once = function(key, fn, ttl) {
    if (!Intercom.supported) {
      return;
    }

    var self = this;
    this._transaction(function() {
      var data;
      try {
        data = JSON.parse(localStorage.getItem(INDEX_ONCE) || '{}');
      } catch(e) {
        data = {};
      }
      if (!self._once_expired(key, data)) {
        return;
      }

      data[key] = {};
      data[key].timestamp = Date.now();
      if (typeof ttl === 'number') {
        data[key].ttl = ttl * 1000;
      }

      localStorage.setItem(INDEX_ONCE, JSON.stringify(data));
      fn();

      setTimeout(function() {
        self._cleanup_once();
      }, 50);
    });
  };

  extend(Intercom.prototype, EventEmitter.prototype);

  Intercom.supported = (typeof localStorage !== 'undefined');

  var INDEX_EMIT = 'intercom';
  var INDEX_ONCE = 'intercom_once';
  var INDEX_LOCK = 'intercom_lock';

  var THRESHOLD_TTL_EMIT = 50000;
  var THRESHOLD_TTL_ONCE = 1000 * 3600;

  Intercom.destroy = function() {
    localStorage.removeItem(INDEX_LOCK);
    localStorage.removeItem(INDEX_EMIT);
    localStorage.removeItem(INDEX_ONCE);
  };

  Intercom.getInstance = (function() {
    var intercom;
    return function() {
      if (!intercom) {
        intercom = new Intercom();
      }
      return intercom;
    };
  })();

  return Intercom;
});

define('src/fs-watcher',['require','eventemitter','src/path','intercom'],function(require) {

  var EventEmitter = require('eventemitter');
  var isNullPath = require('src/path').isNull;
  var Intercom = require('intercom');

  /**
   * FSWatcher based on node.js' FSWatcher
   * see https://github.com/joyent/node/blob/master/lib/fs.js
   */
  function FSWatcher() {
    EventEmitter.call(this);
    var self = this;
    var recursive = false;
    var filename;

    function onchange(path) {
      // Watch for exact filename, or parent path when recursive is true
      if(filename === path || (recursive && path.indexOf(filename + '/') === 0)) {
        self.trigger('change', 'change', path);
      }
    }

    // We support, but ignore the second arg, which node.js uses.
    self.start = function(filename_, persistent_, recursive_) {
      // Bail if we've already started (and therefore have a filename);
      if(filename) {
        return;
      }

      if(isNullPath(filename_)) {
        throw new Error('Path must be a string without null bytes.');
      }
      // TODO: get realpath for symlinks on filename...
      filename = filename_;

      // Whether to watch beneath this path or not
      recursive = recursive_ === true;

      var intercom = Intercom.getInstance();
      intercom.on('change', onchange);
    };

    self.close = function() {
      var intercom = Intercom.getInstance();
      intercom.off('change', onchange);
      self.removeAllListeners('change');
    };
  }
  FSWatcher.prototype = new EventEmitter();
  FSWatcher.prototype.constructor = FSWatcher;

  return FSWatcher;
});

define('src/directory-entry',['src/constants'], function(Constants) {

  return function DirectoryEntry(id, type) {
    this.id = id;
    this.type = type || Constants.MODE_FILE;
  };

});

define('src/open-file-description',['require'],function(require) {

  return function OpenFileDescription(path, id, flags, position) {
    this.path = path;
    this.id = id;
    this.flags = flags;
    this.position = position;
  };

});

define('src/super-node',['src/constants', 'src/shared'], function(Constants, Shared) {

  return function SuperNode(atime, ctime, mtime) {
    var now = Date.now();

    this.id = Constants.SUPER_NODE_ID;
    this.mode = Constants.MODE_META;
    this.atime = atime || now;
    this.ctime = ctime || now;
    this.mtime = mtime || now;
    this.rnode = Shared.guid(); // root node id (randomly generated)
  };

});

define('src/node',['src/constants', 'src/shared'], function(Constants, Shared) {

  return function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, nlinks, version) {
    var now = Date.now();

    this.id = id || Shared.guid();
    this.mode = mode || Constants.MODE_FILE;  // node type (file, directory, etc)
    this.size = size || 0; // size (bytes for files, entries for directories)
    this.atime = atime || now; // access time (will mirror ctime after creation)
    this.ctime = ctime || now; // creation/change time
    this.mtime = mtime || now; // modified time
    this.flags = flags || []; // file flags
    this.xattrs = xattrs || {}; // extended attributes
    this.nlinks = nlinks || 0; // links count
    this.version = version || 0; // node version
    this.blksize = undefined; // block size
    this.nblocks = 1; // blocks count
    this.data = Shared.guid(); // id for data object
  };

});

define('src/stats',['src/constants'], function(Constants) {

  function Stats(fileNode, devName) {
    this.node = fileNode.id;
    this.dev = devName;
    this.size = fileNode.size;
    this.nlinks = fileNode.nlinks;
    this.atime = fileNode.atime;
    this.mtime = fileNode.mtime;
    this.ctime = fileNode.ctime;
    this.type = fileNode.mode;
  }

  Stats.prototype.isFile = function() {
    return this.type === Constants.MODE_FILE;
  };

  Stats.prototype.isDirectory = function() {
    return this.type === Constants.MODE_DIRECTORY;
  };

  Stats.prototype.isSymbolicLink = function() {
    return this.type === Constants.MODE_SYMBOLIC_LINK;
  };

  // These will always be false in Filer.
  Stats.prototype.isSocket          =
  Stats.prototype.isFIFO            =
  Stats.prototype.isCharacterDevice =
  Stats.prototype.isBlockDevice     =
  function() {
    return false;
  };

  return Stats;

});

define('src/filesystem/implementation',['require','encoding','nodash','src/path','src/path','src/path','src/path','src/path','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/errors','src/directory-entry','src/open-file-description','src/super-node','src/node','src/stats'],function(require) {

  // TextEncoder and TextDecoder will either already be present, or use this shim.
  // Because of the way the spec is defined, we need to get them off the global.
  require('encoding');

  var _ = require('nodash');

  var normalize = require('src/path').normalize;
  var dirname = require('src/path').dirname;
  var basename = require('src/path').basename;
  var isAbsolutePath = require('src/path').isAbsolute;
  var isNullPath = require('src/path').isNull;

  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var MODE_SYMBOLIC_LINK = require('src/constants').MODE_SYMBOLIC_LINK;
  var MODE_META = require('src/constants').MODE_META;

  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var SUPER_NODE_ID = require('src/constants').SUPER_NODE_ID;
  var SYMLOOP_MAX = require('src/constants').SYMLOOP_MAX;

  var O_READ = require('src/constants').O_READ;
  var O_WRITE = require('src/constants').O_WRITE;
  var O_CREATE = require('src/constants').O_CREATE;
  var O_EXCLUSIVE = require('src/constants').O_EXCLUSIVE;
  var O_TRUNCATE = require('src/constants').O_TRUNCATE;
  var O_APPEND = require('src/constants').O_APPEND;
  var O_FLAGS = require('src/constants').O_FLAGS;

  var XATTR_CREATE = require('src/constants').XATTR_CREATE;
  var XATTR_REPLACE = require('src/constants').XATTR_REPLACE;
  var FS_NOMTIME = require('src/constants').FS_NOMTIME;
  var FS_NOCTIME = require('src/constants').FS_NOCTIME;

  var Errors = require('src/errors');
  var DirectoryEntry = require('src/directory-entry');
  var OpenFileDescription = require('src/open-file-description');
  var SuperNode = require('src/super-node');
  var Node = require('src/node');
  var Stats = require('src/stats');

  /**
   * Many functions below use this callback pattern. If it's not
   * re-defined, we use this to generate a callback. NOTE: this
   * can be use for callbacks of both forms without problem (i.e.,
   * since result will be undefined if not returned):
   *  - callback(error)
   *  - callback(error, result)
   */
  function standard_check_result_cb(callback) {
    return function(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    };
  }

  /*
   * Update node times. Only passed times are modified (undefined times are ignored)
   * and filesystem flags are examined in order to override update logic.
   */
  function update_node_times(context, path, node, times, callback) {
    // Honour mount flags for how we update times
    var flags = context.flags;
    if(_(flags).contains(FS_NOCTIME)) {
      delete times.ctime;
    }
    if(_(flags).contains(FS_NOMTIME)) {
      delete times.mtime;
    }

    // Only do the update if required (i.e., times are still present)
    var update = false;
    if(times.ctime) {
      node.ctime = times.ctime;
      // We don't do atime tracking for perf reasons, but do mirror ctime
      node.atime = times.ctime;
      update = true;
    }
    if(times.atime) {
      // The only time we explicitly pass atime is when utimes(), futimes() is called.
      // Override ctime mirror here if so
      node.atime = times.atime;
      update = true;
    }
    if(times.mtime) {
      node.mtime = times.mtime;
      update = true;
    }

    function complete(error) {
      // Queue this change so we can send watch events.
      // Unlike node.js, we send the full path vs. basename/dirname only.
      context.changes.push({ event: 'change', path: path });
      callback(error);
    }

    if(update) {
      context.put(node.id, node, complete);
    } else {
      complete();
    }
  }

  /*
   * find_node
   */

  // in: file or directory path
  // out: node structure, or error
  function find_node(context, path, callback) {
    path = normalize(path);
    if(!path) {
      return callback(new Errors.ENOENT('path is an empty string'));
    }
    var name = basename(path);
    var parentPath = dirname(path);
    var followedCount = 0;

    function read_root_directory_node(error, superNode) {
      if(error) {
        callback(error);
      } else if(!superNode || superNode.mode !== MODE_META || !superNode.rnode) {
        callback(new Errors.EFILESYSTEMERROR());
      } else {
        context.get(superNode.rnode, check_root_directory_node);
      }
    }

    function check_root_directory_node(error, rootDirectoryNode) {
      if(error) {
        callback(error);
      } else if(!rootDirectoryNode) {
        callback(new Errors.ENOENT());
      } else {
        callback(null, rootDirectoryNode);
      }
    }

    // in: parent directory node
    // out: parent directory data
    function read_parent_directory_data(error, parentDirectoryNode) {
      if(error) {
        callback(error);
      } else if(parentDirectoryNode.mode !== MODE_DIRECTORY || !parentDirectoryNode.data) {
        callback(new Errors.ENOTDIR('a component of the path prefix is not a directory'));
      } else {
        context.get(parentDirectoryNode.data, get_node_from_parent_directory_data);
      }
    }

    // in: parent directory data
    // out: searched node
    function get_node_from_parent_directory_data(error, parentDirectoryData) {
      if(error) {
        callback(error);
      } else {
        if(!_(parentDirectoryData).has(name)) {
          callback(new Errors.ENOENT());
        } else {
          var nodeId = parentDirectoryData[name].id;
          context.get(nodeId, is_symbolic_link);
        }
      }
    }

    function is_symbolic_link(error, node) {
      if(error) {
        callback(error);
      } else {
        if(node.mode == MODE_SYMBOLIC_LINK) {
          followedCount++;
          if(followedCount > SYMLOOP_MAX){
            callback(new Errors.ELOOP());
          } else {
            follow_symbolic_link(node.data);
          }
        } else {
          callback(null, node);
        }
      }
    }

    function follow_symbolic_link(data) {
      data = normalize(data);
      parentPath = dirname(data);
      name = basename(data);
      if(ROOT_DIRECTORY_NAME == name) {
        context.get(SUPER_NODE_ID, read_root_directory_node);
      } else {
        find_node(context, parentPath, read_parent_directory_data);
      }
    }

    if(ROOT_DIRECTORY_NAME == name) {
      context.get(SUPER_NODE_ID, read_root_directory_node);
    } else {
      find_node(context, parentPath, read_parent_directory_data);
    }
  }


  /*
   * set extended attribute (refactor)
   */

  function set_extended_attribute (context, path_or_fd, name, value, flag, callback) {
    var path;

    function set_xattr (error, node) {
      var xattr = (node ? node.xattrs[name] : null);

      function update_time(error) {
        if(error) {
          callback(error);
        } else {
          update_node_times(context, path, node, { ctime: Date.now() }, callback);
        }
      }

      if (error) {
        callback(error);
      }
      else if (flag === XATTR_CREATE && node.xattrs.hasOwnProperty(name)) {
        callback(new Errors.EEXIST('attribute already exists'));
      }
      else if (flag === XATTR_REPLACE && !node.xattrs.hasOwnProperty(name)) {
        callback(new Errors.ENOATTR());
      }
      else {
        node.xattrs[name] = value;
        context.put(node.id, node, update_time);
      }
    }

    if (typeof path_or_fd == 'string') {
      path = path_or_fd;
      find_node(context, path_or_fd, set_xattr);
    }
    else if (typeof path_or_fd == 'object' && typeof path_or_fd.id == 'string') {
      path = path_or_fd.path;
      context.get(path_or_fd.id, set_xattr);
    }
    else {
      callback(new Errors.EINVAL('path or file descriptor of wrong type'));
    }
  }

  /*
   * make_root_directory
   */

  // Note: this should only be invoked when formatting a new file system
  function make_root_directory(context, callback) {
    var superNode;
    var directoryNode;
    var directoryData;

    function write_super_node(error, existingNode) {
      if(!error && existingNode) {
        callback(new Errors.EEXIST());
      } else if(error && !(error instanceof Errors.ENOENT)) {
        callback(error);
      } else {
        superNode = new SuperNode();
        context.put(superNode.id, superNode, write_directory_node);
      }
    }

    function write_directory_node(error) {
      if(error) {
        callback(error);
      } else {
        directoryNode = new Node(superNode.rnode, MODE_DIRECTORY);
        directoryNode.nlinks += 1;
        context.put(directoryNode.id, directoryNode, write_directory_data);
      }
    }

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        context.put(directoryNode.data, directoryData, callback);
      }
    }

    context.get(SUPER_NODE_ID, write_super_node);
  }

  /*
   * make_directory
   */

  function make_directory(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function check_if_directory_exists(error, result) {
      if(!error && result) {
        callback(new Errors.EEXIST());
      } else if(error && !(error instanceof Errors.ENOENT)) {
        callback(error);
      } else {
        find_node(context, parentPath, read_parent_directory_data);
      }
    }

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        context.get(parentDirectoryNode.data, write_directory_node);
      }
    }

    function write_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        directoryNode = new Node(undefined, MODE_DIRECTORY);
        directoryNode.nlinks += 1;
        context.put(directoryNode.id, directoryNode, write_directory_data);
      }
    }

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        context.put(directoryNode.data, directoryData, update_parent_directory_data);
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, parentPath, parentDirectoryNode, { mtime: now, ctime: now }, callback);
      }
    }

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
        context.put(parentDirectoryNode.data, parentDirectoryData, update_time);
      }
    }

    find_node(context, path, check_if_directory_exists);
  }

  /*
   * remove_directory
   */

  function remove_directory(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        context.get(parentDirectoryNode.data, check_if_node_exists);
      }
    }

    function check_if_node_exists(error, result) {
      if(error) {
        callback(error);
      } else if(ROOT_DIRECTORY_NAME == name) {
        callback(new Errors.EBUSY());
      } else if(!_(result).has(name)) {
        callback(new Errors.ENOENT());
      } else {
        parentDirectoryData = result;
        directoryNode = parentDirectoryData[name].id;
        context.get(directoryNode, check_if_node_is_directory);
      }
    }

    function check_if_node_is_directory(error, result) {
      if(error) {
        callback(error);
      } else if(result.mode != MODE_DIRECTORY) {
        callback(new Errors.ENOTDIR());
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_directory_is_empty);
      }
    }

    function check_if_directory_is_empty(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).size() > 0) {
          callback(new Errors.ENOTEMPTY());
        } else {
          remove_directory_entry_from_parent_directory_node();
        }
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, parentPath, parentDirectoryNode, { mtime: now, ctime: now }, remove_directory_node);
      }
    }

    function remove_directory_entry_from_parent_directory_node() {
      delete parentDirectoryData[name];
      context.put(parentDirectoryNode.data, parentDirectoryData, update_time);
    }

    function remove_directory_node(error) {
      if(error) {
        callback(error);
      } else {
        context.delete(directoryNode.id, remove_directory_data);
      }
    }

    function remove_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        context.delete(directoryNode.data, callback);
      }
    }

    find_node(context, parentPath, read_parent_directory_data);
  }

  function open_file(context, path, flags, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var directoryEntry;
    var fileNode;
    var fileData;

    var followedCount = 0;

    if(ROOT_DIRECTORY_NAME == name) {
      if(_(flags).contains(O_WRITE)) {
        callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set'));
      } else {
        find_node(context, path, set_file_node);
      }
    } else {
      find_node(context, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).has(name)) {
          if(_(flags).contains(O_EXCLUSIVE)) {
            callback(new Errors.ENOENT('O_CREATE and O_EXCLUSIVE are set, and the named file exists'));
          } else {
            directoryEntry = directoryData[name];
            if(directoryEntry.type == MODE_DIRECTORY && _(flags).contains(O_WRITE)) {
              callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set'));
            } else {
              context.get(directoryEntry.id, check_if_symbolic_link);
            }
          }
        } else {
          if(!_(flags).contains(O_CREATE)) {
            callback(new Errors.ENOENT('O_CREATE is not set and the named file does not exist'));
          } else {
            write_file_node();
          }
        }
      }
    }

    function check_if_symbolic_link(error, result) {
      if(error) {
        callback(error);
      } else {
        var node = result;
        if(node.mode == MODE_SYMBOLIC_LINK) {
          followedCount++;
          if(followedCount > SYMLOOP_MAX){
            callback(new Errors.ELOOP());
          } else {
            follow_symbolic_link(node.data);
          }
        } else {
          set_file_node(undefined, node);
        }
      }
    }

    function follow_symbolic_link(data) {
      data = normalize(data);
      parentPath = dirname(data);
      name = basename(data);
      if(ROOT_DIRECTORY_NAME == name) {
        if(_(flags).contains(O_WRITE)) {
          callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set'));
        } else {
          find_node(context, path, set_file_node);
        }
      }
      find_node(context, parentPath, read_directory_data);
    }

    function set_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        callback(null, fileNode);
      }
    }

    function write_file_node() {
      fileNode = new Node(undefined, MODE_FILE);
      fileNode.nlinks += 1;
      context.put(fileNode.id, fileNode, write_file_data);
    }

    function write_file_data(error) {
      if(error) {
        callback(error);
      } else {
        fileData = new Uint8Array(0);
        context.put(fileNode.data, fileData, update_directory_data);
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, handle_update_result);
      }
    }

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_FILE);
        context.put(directoryNode.data, directoryData, update_time);
      }
    }

    function handle_update_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, fileNode);
      }
    }
  }

  function replace_data(context, ofd, buffer, offset, length, callback) {
    var fileNode;

    function return_nbytes(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, length);
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, ofd.path, fileNode, { mtime: now, ctime: now }, return_nbytes);
      }
    }

    function update_file_node(error) {
      if(error) {
        callback(error);
      } else {
        context.put(fileNode.id, fileNode, update_time);
      }
    }

    function write_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        var newData = new Uint8Array(length);
        var bufferWindow = buffer.subarray(offset, offset + length);
        newData.set(bufferWindow);
        ofd.position = length;

        fileNode.size = length;
        fileNode.version += 1;

        context.put(fileNode.data, newData, update_file_node);
      }
    }

    context.get(ofd.id, write_file_data);
  }

  function write_data(context, ofd, buffer, offset, length, position, callback) {
    var fileNode;
    var fileData;

    function return_nbytes(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, length);
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, ofd.path, fileNode, { mtime: now, ctime: now }, return_nbytes);
      }
    }

    function update_file_node(error) {
      if(error) {
        callback(error);
      } else {
        context.put(fileNode.id, fileNode, update_time);
      }
    }

    function update_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileData = result;
        var _position = (!(undefined === position || null === position)) ? position : ofd.position;
        var newSize = Math.max(fileData.length, _position + length);
        var newData = new Uint8Array(newSize);
        if(fileData) {
          newData.set(fileData);
        }
        var bufferWindow = buffer.subarray(offset, offset + length);
        newData.set(bufferWindow, _position);
        if(undefined === position) {
          ofd.position += length;
        }

        fileNode.size = newSize;
        fileNode.version += 1;

        context.put(fileNode.data, newData, update_file_node);
      }
    }

    function read_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        context.get(fileNode.data, update_file_data);
      }
    }

    context.get(ofd.id, read_file_data);
  }

  function read_data(context, ofd, buffer, offset, length, position, callback) {
    var fileNode;
    var fileData;

    function handle_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileData = result;
        var _position = (!(undefined === position || null === position)) ? position : ofd.position;
        length = (_position + length > buffer.length) ? length - _position : length;
        var dataView = fileData.subarray(_position, _position + length);
        buffer.set(dataView, offset);
        if(undefined === position) {
          ofd.position += length;
        }
        callback(null, length);
      }
    }

    function read_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        context.get(fileNode.data, handle_file_data);
      }
    }

    context.get(ofd.id, read_file_data);
  }

  function stat_file(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    find_node(context, path, standard_check_result_cb(callback));
  }

  function fstat_file(context, ofd, callback) {
    context.get(ofd.id, standard_check_result_cb(callback));
  }

  function lstat_file(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;

    if(ROOT_DIRECTORY_NAME == name) {
      find_node(context, path, standard_check_result_cb(callback));
    } else {
      find_node(context, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(!_(directoryData).has(name)) {
          callback(new Errors.ENOENT('a component of the path does not name an existing file'));
        } else {
          context.get(directoryData[name].id, standard_check_result_cb(callback));
        }
      }
    }
  }

  function link_node(context, oldpath, newpath, callback) {
    oldpath = normalize(oldpath);
    var oldname = basename(oldpath);
    var oldParentPath = dirname(oldpath);

    newpath = normalize(newpath);
    var newname = basename(newpath);
    var newParentPath = dirname(newpath);

    var oldDirectoryNode;
    var oldDirectoryData;
    var newDirectoryNode;
    var newDirectoryData;
    var fileNode;

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, newpath,  fileNode, { ctime: Date.now() }, callback);
      }
    }

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks += 1;
        context.put(fileNode.id, fileNode, update_time);
      }
    }

    function read_directory_entry(error, result) {
      if(error) {
        callback(error);
      } else {
        context.get(newDirectoryData[newname].id, update_file_node);
      }
    }

    function check_if_new_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        newDirectoryData = result;
        if(_(newDirectoryData).has(newname)) {
          callback(new Errors.EEXIST('newpath resolves to an existing file'));
        } else {
          newDirectoryData[newname] = oldDirectoryData[oldname];
          context.put(newDirectoryNode.data, newDirectoryData, read_directory_entry);
        }
      }
    }

    function read_new_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        newDirectoryNode = result;
        context.get(newDirectoryNode.data, check_if_new_file_exists);
      }
    }

    function check_if_old_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        oldDirectoryData = result;
        if(!_(oldDirectoryData).has(oldname)) {
          callback(new Errors.ENOENT('a component of either path prefix does not exist'));
        } else {
          find_node(context, newParentPath, read_new_directory_data);
        }
      }
    }

    function read_old_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        oldDirectoryNode = result;
        context.get(oldDirectoryNode.data, check_if_old_file_exists);
      }
    }

    find_node(context, oldParentPath, read_old_directory_data);
  }

  function unlink_node(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var fileNode;

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        delete directoryData[name];
        context.put(directoryNode.data, directoryData, function(error) {
          var now = Date.now();
          update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, callback);
        });
      }
    }

    function delete_file_data(error) {
      if(error) {
        callback(error);
      } else {
        context.delete(fileNode.data, update_directory_data);
      }
    }

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks -= 1;
        if(fileNode.nlinks < 1) {
          context.delete(fileNode.id, delete_file_data);
        } else {
          context.put(fileNode.id, fileNode, function(error) {
            update_node_times(context, path, fileNode, { ctime: Date.now() }, update_directory_data);
          });
        }
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(!_(directoryData).has(name)) {
          callback(new Errors.ENOENT('a component of the path does not name an existing file'));
        } else {
          context.get(directoryData[name].id, update_file_node);
        }
      }
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    find_node(context, parentPath, read_directory_data);
  }

  function read_directory(context, path, callback) {
    path = normalize(path);
    var name = basename(path);

    var directoryNode;
    var directoryData;

    function handle_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        var files = Object.keys(directoryData);
        callback(null, files);
      }
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, handle_directory_data);
      }
    }

    find_node(context, path, read_directory_data);
  }

  function make_symbolic_link(context, srcpath, dstpath, callback) {
    dstpath = normalize(dstpath);
    var name = basename(dstpath);
    var parentPath = dirname(dstpath);

    var directoryNode;
    var directoryData;
    var fileNode;

    if(ROOT_DIRECTORY_NAME == name) {
      callback(new Errors.EEXIST());
    } else {
      find_node(context, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).has(name)) {
          callback(new Errors.EEXIST());
        } else {
          write_file_node();
        }
      }
    }

    function write_file_node() {
      fileNode = new Node(undefined, MODE_SYMBOLIC_LINK);
      fileNode.nlinks += 1;
      fileNode.size = srcpath.length;
      fileNode.data = srcpath;
      context.put(fileNode.id, fileNode, update_directory_data);
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, callback);
      }
    }

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_SYMBOLIC_LINK);
        context.put(directoryNode.data, directoryData, update_time);
      }
    }
  }

  function read_link(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;

    find_node(context, parentPath, read_directory_data);

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(!_(directoryData).has(name)) {
          callback(new Errors.ENOENT('a component of the path does not name an existing file'));
        } else {
          context.get(directoryData[name].id, check_if_symbolic);
        }
      }
    }

    function check_if_symbolic(error, result) {
      if(error) {
        callback(error);
      } else {
        if(result.mode != MODE_SYMBOLIC_LINK) {
          callback(new Errors.EINVAL("path not a symbolic link"));
        } else {
          callback(null, result.data);
        }
      }
    }
  }

  function truncate_file(context, path, length, callback) {
    path = normalize(path);

    var fileNode;

    function read_file_data (error, node) {
      if (error) {
        callback(error);
      } else if(node.mode == MODE_DIRECTORY ) {
        callback(new Errors.EISDIR());
      } else{
        fileNode = node;
        context.get(fileNode.data, truncate_file_data);
      }
    }

    function truncate_file_data(error, fileData) {
      if (error) {
        callback(error);
      } else {
        var data = new Uint8Array(length);
        if(fileData) {
          data.set(fileData.subarray(0, length));
        }
        context.put(fileNode.data, data, update_file_node);
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, path, fileNode, { mtime: now, ctime: now }, callback);
      }
    }

    function update_file_node (error) {
      if(error) {
        callback(error);
      } else {
        fileNode.size = length;
        fileNode.version += 1;
        context.put(fileNode.id, fileNode, update_time);
      }
    }

    if(length < 0) {
      callback(new Errors.EINVAL('length cannot be negative'));
    } else {
      find_node(context, path, read_file_data);
    }
  }

  function ftruncate_file(context, ofd, length, callback) {
    var fileNode;

    function read_file_data (error, node) {
      if (error) {
        callback(error);
      } else if(node.mode == MODE_DIRECTORY ) {
        callback(new Errors.EISDIR());
      } else{
        fileNode = node;
        context.get(fileNode.data, truncate_file_data);
      }
    }

    function truncate_file_data(error, fileData) {
      if (error) {
        callback(error);
      } else {
        var data = new Uint8Array(length);
        if(fileData) {
          data.set(fileData.subarray(0, length));
        }
        context.put(fileNode.data, data, update_file_node);
      }
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        var now = Date.now();
        update_node_times(context, ofd.path, fileNode, { mtime: now, ctime: now }, callback);
      }
    }
    function update_file_node (error) {
      if(error) {
        callback(error);
      } else {
        fileNode.size = length;
        fileNode.version += 1;
        context.put(fileNode.id, fileNode, update_time);
      }
    }

    if(length < 0) {
      callback(new Errors.EINVAL('length cannot be negative'));
    } else {
      context.get(ofd.id, read_file_data);
    }
  }

  function utimes_file(context, path, atime, mtime, callback) {
    path = normalize(path);

    function update_times(error, node) {
      if (error) {
        callback(error);
      } else {
        update_node_times(context, path, node, { atime: atime, ctime: mtime, mtime: mtime }, callback);
      }
    }

    if (typeof atime != 'number' || typeof mtime != 'number') {
      callback(new Errors.EINVAL('atime and mtime must be number'));
    }
    else if (atime < 0 || mtime < 0) {
      callback(new Errors.EINVAL('atime and mtime must be positive integers'));
    }
    else {
      find_node(context, path, update_times);
    }
  }

  function futimes_file(context, ofd, atime, mtime, callback) {

    function update_times (error, node) {
      if (error) {
        callback(error);
      } else {
        update_node_times(context, ofd.path, node, { atime: atime, ctime: mtime, mtime: mtime }, callback);
      }
    }

    if (typeof atime != 'number' || typeof mtime != 'number') {
      callback(new Errors.EINVAL('atime and mtime must be a number'));
    }
    else if (atime < 0 || mtime < 0) {
      callback(new Errors.EINVAL('atime and mtime must be positive integers'));
    }
    else {
      context.get(ofd.id, update_times);
    }
  }

  function setxattr_file(context, path, name, value, flag, callback) {
    path = normalize(path);

    if (typeof name != 'string') {
      callback(new Errors.EINVAL('attribute name must be a string'));
    }
    else if (!name) {
      callback(new Errors.EINVAL('attribute name cannot be an empty string'));
    }
    else if (flag !== null &&
        flag !== XATTR_CREATE && flag !== XATTR_REPLACE) {
      callback(new Errors.EINVAL('invalid flag, must be null, XATTR_CREATE or XATTR_REPLACE'));
    }
    else {
      set_extended_attribute(context, path, name, value, flag, callback);
    }
  }

  function fsetxattr_file (context, ofd, name, value, flag, callback) {
    if (typeof name != 'string') {
      callback(new Errors.EINVAL('attribute name must be a string'));
    }
    else if (!name) {
      callback(new Errors.EINVAL('attribute name cannot be an empty string'));
    }
    else if (flag !== null &&
        flag !== XATTR_CREATE && flag !== XATTR_REPLACE) {
      callback(new Errors.EINVAL('invalid flag, must be null, XATTR_CREATE or XATTR_REPLACE'));
    }
    else {
      set_extended_attribute(context, ofd, name, value, flag, callback);
    }
  }

  function getxattr_file (context, path, name, callback) {
    path = normalize(path);

    function get_xattr(error, node) {
      var xattr = (node ? node.xattrs[name] : null);

      if (error) {
        callback (error);
      }
      else if (!node.xattrs.hasOwnProperty(name)) {
        callback(new Errors.ENOATTR());
      }
      else {
        callback(null, node.xattrs[name]);
      }
    }

    if (typeof name != 'string') {
      callback(new Errors.EINVAL('attribute name must be a string'));
    }
    else if (!name) {
      callback(new Errors.EINVAL('attribute name cannot be an empty string'));
    }
    else {
      find_node(context, path, get_xattr);
    }
  }

  function fgetxattr_file (context, ofd, name, callback) {

    function get_xattr (error, node) {
      var xattr = (node ? node.xattrs[name] : null);

      if (error) {
        callback(error);
      }
      else if (!node.xattrs.hasOwnProperty(name)) {
        callback(new Errors.ENOATTR());
      }
      else {
        callback(null, node.xattrs[name]);
      }
    }

    if (typeof name != 'string') {
      callback(new Errors.EINVAL());
    }
    else if (!name) {
      callback(new Errors.EINVAL('attribute name cannot be an empty string'));
    }
    else {
      context.get(ofd.id, get_xattr);
    }
  }

  function removexattr_file (context, path, name, callback) {
    path = normalize(path);

    function remove_xattr (error, node) {
      var xattr = (node ? node.xattrs : null);

      function update_time(error) {
        if(error) {
          callback(error);
        } else {
          update_node_times(context, path, node, { ctime: Date.now() }, callback);
        }
      }

      if (error) {
        callback(error);
      }
      else if (!xattr.hasOwnProperty(name)) {
        callback(new Errors.ENOATTR());
      }
      else {
        delete node.xattrs[name];
        context.put(node.id, node, update_time);
      }
    }

    if (typeof name != 'string') {
      callback(new Errors.EINVAL('attribute name must be a string'));
    }
    else if (!name) {
      callback(new Errors.EINVAL('attribute name cannot be an empty string'));
    }
    else {
      find_node(context, path, remove_xattr);
    }
  }

  function fremovexattr_file (context, ofd, name, callback) {

    function remove_xattr (error, node) {
      function update_time(error) {
        if(error) {
          callback(error);
        } else {
          update_node_times(context, ofd.path, node, { ctime: Date.now() }, callback);
        }
      }

      if (error) {
        callback(error);
      }
      else if (!node.xattrs.hasOwnProperty(name)) {
        callback(new Errors.ENOATTR());
      }
      else {
        delete node.xattrs[name];
        context.put(node.id, node, update_time);
      }
    }

    if (typeof name != 'string') {
      callback(new Errors.EINVAL('attribute name must be a string'));
    }
    else if (!name) {
      callback(new Errors.EINVAL('attribute name cannot be an empty string'));
    }
    else {
      context.get(ofd.id, remove_xattr);
    }
  }

  function validate_flags(flags) {
    if(!_(O_FLAGS).has(flags)) {
      return null;
    }
    return O_FLAGS[flags];
  }

  function validate_file_options(options, enc, fileMode){
    if(!options) {
      options = { encoding: enc, flag: fileMode };
    } else if(typeof options === "function") {
      options = { encoding: enc, flag: fileMode };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: fileMode };
    }
    return options;
  }

  function pathCheck(path, callback) {
    var err;
    if(isNullPath(path)) {
      err = new Error('Path must be a string without null bytes.');
    } else if(!isAbsolutePath(path)) {
      err = new Error('Path must be absolute.');
    }

    if(err) {
      callback(err);
      return false;
    }
    return true;
  }


  function open(fs, context, path, flags, mode, callback) {
    // NOTE: we support the same signature as node with a `mode` arg,
    // but ignore it.
    callback = arguments[arguments.length - 1];
    if(!pathCheck(path, callback)) return;

    function check_result(error, fileNode) {
      if(error) {
        callback(error);
      } else {
        var position;
        if(_(flags).contains(O_APPEND)) {
          position = fileNode.size;
        } else {
          position = 0;
        }
        var openFileDescription = new OpenFileDescription(path, fileNode.id, flags, position);
        var fd = fs.allocDescriptor(openFileDescription);
        callback(null, fd);
      }
    }

    flags = validate_flags(flags);
    if(!flags) {
      callback(new Errors.EINVAL('flags is not valid'));
    }

    open_file(context, path, flags, check_result);
  }

  function close(fs, context, fd, callback) {
    if(!_(fs.openFiles).has(fd)) {
      callback(new Errors.EBADF());
    } else {
      fs.releaseDescriptor(fd);
      callback(null);
    }
  }

  function mkdir(fs, context, path, mode, callback) {
    // NOTE: we support passing a mode arg, but we ignore it internally for now.
    callback = arguments[arguments.length - 1];
    if(!pathCheck(path, callback)) return;
    make_directory(context, path, standard_check_result_cb(callback));
  }

  function rmdir(fs, context, path, callback) {
    if(!pathCheck(path, callback)) return;
    remove_directory(context, path, standard_check_result_cb(callback));
  }

  function stat(fs, context, path, callback) {
    if(!pathCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, fs.name);
        callback(null, stats);
      }
    }

    stat_file(context, path, check_result);
  }

  function fstat(fs, context, fd, callback) {
    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, fs.name);
        callback(null, stats);
      }
    }

    var ofd = fs.openFiles[fd];
    if(!ofd) {
      callback(new Errors.EBADF());
    } else {
      fstat_file(context, ofd, check_result);
    }
  }

  function link(fs, context, oldpath, newpath, callback) {
    if(!pathCheck(oldpath, callback)) return;
    if(!pathCheck(newpath, callback)) return;
    link_node(context, oldpath, newpath, standard_check_result_cb(callback));
  }

  function unlink(fs, context, path, callback) {
    if(!pathCheck(path, callback)) return;
    unlink_node(context, path, standard_check_result_cb(callback));
  }

  function read(fs, context, fd, buffer, offset, length, position, callback) {
    // Follow how node.js does this
    function wrapped_cb(err, bytesRead) {
      // Retain a reference to buffer so that it can't be GC'ed too soon.
      callback(err, bytesRead || 0, buffer);
    }

    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;
    callback = arguments[arguments.length - 1];

    var ofd = fs.openFiles[fd];
    if(!ofd) {
      callback(new Errors.EBADF());
    } else if(!_(ofd.flags).contains(O_READ)) {
      callback(new Errors.EBADF('descriptor does not permit reading'));
    } else {
      read_data(context, ofd, buffer, offset, length, position, standard_check_result_cb(wrapped_cb));
    }
  }

  function readFile(fs, context, path, options, callback) {
    callback = arguments[arguments.length - 1];
    options = validate_file_options(options, null, 'r');

    if(!pathCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'r');
    if(!flags) {
      callback(new Errors.EINVAL('flags is not valid'));
    }

    open_file(context, path, flags, function(err, fileNode) {
      if(err) {
        return callback(err);
      }
      var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
      var fd = fs.allocDescriptor(ofd);

      fstat_file(context, ofd, function(err2, fstatResult) {
        if(err2) {
          return callback(err2);
        }

        var stats = new Stats(fstatResult, fs.name);
        var size = stats.size;
        var buffer = new Uint8Array(size);

        read_data(context, ofd, buffer, 0, size, 0, function(err3, nbytes) {
          if(err3) {
            return callback(err3);
          }
          fs.releaseDescriptor(fd);

          var data;
          if(options.encoding === 'utf8') {
            data = new TextDecoder('utf-8').decode(buffer);
          } else {
            data = buffer;
          }
          callback(null, data);
        });
      });
    });
  }

  function write(fs, context, fd, buffer, offset, length, position, callback) {
    callback = arguments[arguments.length - 1];
    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    var ofd = fs.openFiles[fd];
    if(!ofd) {
      callback(new Errors.EBADF());
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new Errors.EBADF('descriptor does not permit writing'));
    } else if(buffer.length - offset < length) {
      callback(new Errors.EIO('intput buffer is too small'));
    } else {
      write_data(context, ofd, buffer, offset, length, position, standard_check_result_cb(callback));
    }
  }

  function writeFile(fs, context, path, data, options, callback) {
    callback = arguments[arguments.length - 1];
    options = validate_file_options(options, 'utf8', 'w');

    if(!pathCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'w');
    if(!flags) {
      callback(new Errors.EINVAL('flags is not valid'));
    }

    data = data || '';
    if(typeof data === "number") {
      data = '' + data;
    }
    if(typeof data === "string" && options.encoding === 'utf8') {
      data = new TextEncoder('utf-8').encode(data);
    }

    open_file(context, path, flags, function(err, fileNode) {
      if(err) {
        return callback(err);
      }
      var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
      var fd = fs.allocDescriptor(ofd);

      replace_data(context, ofd, data, 0, data.length, function(err2, nbytes) {
        if(err2) {
          return callback(err2);
        }
        fs.releaseDescriptor(fd);
        callback(null);
      });
    });
  }

  function appendFile(fs, context, path, data, options, callback) {
    callback = arguments[arguments.length - 1];
    options = validate_file_options(options, 'utf8', 'a');

    if(!pathCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'a');
    if(!flags) {
      callback(new Errors.EINVAL('flags is not valid'));
    }

    data = data || '';
    if(typeof data === "number") {
      data = '' + data;
    }
    if(typeof data === "string" && options.encoding === 'utf8') {
      data = new TextEncoder('utf-8').encode(data);
    }

    open_file(context, path, flags, function(err, fileNode) {
      if(err) {
        return callback(err);
      }
      var ofd = new OpenFileDescription(path, fileNode.id, flags, fileNode.size);
      var fd = fs.allocDescriptor(ofd);

      write_data(context, ofd, data, 0, data.length, ofd.position, function(err2, nbytes) {
        if(err2) {
          return callback(err2);
        }
        fs.releaseDescriptor(fd);
        callback(null);
      });
    });
  }

  function exists(fs, context, path, callback) {
    function cb(err, stats) {
      callback(err ? false : true);
    }
    stat(fs, context, path, cb);
  }

  function getxattr(fs, context, path, name, callback) {
    if (!pathCheck(path, callback)) return;
    getxattr_file(context, path, name, standard_check_result_cb(callback));
  }

  function fgetxattr(fs, context, fd, name, callback) {
    var ofd = fs.openFiles[fd];
    if (!ofd) {
      callback(new Errors.EBADF());
    }
    else {
      fgetxattr_file(context, ofd, name, standard_check_result_cb(callback));
    }
  }

  function setxattr(fs, context, path, name, value, flag, callback) {
    if(typeof flag === 'function') {
      callback = flag;
      flag = null;
    }

    if (!pathCheck(path, callback)) return;
    setxattr_file(context, path, name, value, flag, standard_check_result_cb(callback));
  }

  function fsetxattr(fs, context, fd, name, value, flag, callback) {
    if(typeof flag === 'function') {
      callback = flag;
      flag = null;
    }

    var ofd = fs.openFiles[fd];
    if (!ofd) {
      callback(new Errors.EBADF());
    }
    else if (!_(ofd.flags).contains(O_WRITE)) {
      callback(new Errors.EBADF('descriptor does not permit writing'));
    }
    else {
      fsetxattr_file(context, ofd, name, value, flag, standard_check_result_cb(callback));
    }
  }

  function removexattr(fs, context, path, name, callback) {
    if (!pathCheck(path, callback)) return;
    removexattr_file(context, path, name, standard_check_result_cb(callback));
  }

  function fremovexattr(fs, context, fd, name, callback) {
    var ofd = fs.openFiles[fd];
    if (!ofd) {
      callback(new Errors.EBADF());
    }
    else if (!_(ofd.flags).contains(O_WRITE)) {
      callback(new Errors.EBADF('descriptor does not permit writing'));
    }
    else {
      fremovexattr_file(context, ofd, name, standard_check_result_cb(callback));
    }
  }

  function lseek(fs, context, fd, offset, whence, callback) {
    function update_descriptor_position(error, stats) {
      if(error) {
        callback(error);
      } else {
        if(stats.size + offset < 0) {
          callback(new Errors.EINVAL('resulting file offset would be negative'));
        } else {
          ofd.position = stats.size + offset;
          callback(null, ofd.position);
        }
      }
    }

    var ofd = fs.openFiles[fd];
    if(!ofd) {
      callback(new Errors.EBADF());
    }

    if('SET' === whence) {
      if(offset < 0) {
        callback(new Errors.EINVAL('resulting file offset would be negative'));
      } else {
        ofd.position = offset;
        callback(null, ofd.position);
      }
    } else if('CUR' === whence) {
      if(ofd.position + offset < 0) {
        callback(new Errors.EINVAL('resulting file offset would be negative'));
      } else {
        ofd.position += offset;
        callback(null, ofd.position);
      }
    } else if('END' === whence) {
      fstat_file(context, ofd, update_descriptor_position);
    } else {
      callback(new Errors.EINVAL('whence argument is not a proper value'));
    }
  }

  function readdir(fs, context, path, callback) {
    if(!pathCheck(path, callback)) return;
    read_directory(context, path, standard_check_result_cb(callback));
  }

  function utimes(fs, context, path, atime, mtime, callback) {
    if(!pathCheck(path, callback)) return;

    var currentTime = Date.now();
    atime = (atime) ? atime : currentTime;
    mtime = (mtime) ? mtime : currentTime;

    utimes_file(context, path, atime, mtime, standard_check_result_cb(callback));
  }

  function futimes(fs, context, fd, atime, mtime, callback) {
    var currentTime = Date.now();
    atime = (atime) ? atime : currentTime;
    mtime = (mtime) ? mtime : currentTime;

    var ofd = fs.openFiles[fd];
    if(!ofd) {
      callback(new Errors.EBADF());
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new Errors.EBADF('descriptor does not permit writing'));
    } else {
      futimes_file(context, ofd, atime, mtime, standard_check_result_cb(callback));
    }
  }

  function rename(fs, context, oldpath, newpath, callback) {
    if(!pathCheck(oldpath, callback)) return;
    if(!pathCheck(newpath, callback)) return;

    function unlink_old_node(error) {
      if(error) {
        callback(error);
      } else {
        unlink_node(context, oldpath, standard_check_result_cb(callback));
      }
    }

    link_node(context, oldpath, newpath, unlink_old_node);
  }

  function symlink(fs, context, srcpath, dstpath, type, callback) {
    // NOTE: we support passing the `type` arg, but ignore it.
    callback = arguments[arguments.length - 1];
    if(!pathCheck(srcpath, callback)) return;
    if(!pathCheck(dstpath, callback)) return;
    make_symbolic_link(context, srcpath, dstpath, standard_check_result_cb(callback));
  }

  function readlink(fs, context, path, callback) {
    if(!pathCheck(path, callback)) return;
    read_link(context, path, standard_check_result_cb(callback));
  }

  function lstat(fs, context, path, callback) {
    if(!pathCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, fs.name);
        callback(null, stats);
      }
    }

    lstat_file(context, path, check_result);
  }

  function truncate(fs, context, path, length, callback) {
    // NOTE: length is optional
    callback = arguments[arguments.length - 1];
    length = length || 0;

    if(!pathCheck(path, callback)) return;
    truncate_file(context, path, length, standard_check_result_cb(callback));
  }

  function ftruncate(fs, context, fd, length, callback) {
    // NOTE: length is optional
    callback = arguments[arguments.length - 1];
    length = length || 0;

    var ofd = fs.openFiles[fd];
    if(!ofd) {
      callback(new Errors.EBADF());
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new Errors.EBADF('descriptor does not permit writing'));
    } else {
      ftruncate_file(context, ofd, length, standard_check_result_cb(callback));
    }
  }

  return {
    makeRootDirectory: make_root_directory,
    open: open,
    close: close,
    mkdir: mkdir,
    rmdir: rmdir,
    unlink: unlink,
    stat: stat,
    fstat: fstat,
    link: link,
    read: read,
    readFile: readFile,
    write: write,
    writeFile: writeFile,
    appendFile: appendFile,
    exists: exists,
    getxattr: getxattr,
    fgetxattr: fgetxattr,
    setxattr: setxattr,
    fsetxattr: fsetxattr,
    removexattr: removexattr,
    fremovexattr: fremovexattr,
    lseek: lseek,
    readdir: readdir,
    utimes: utimes,
    futimes: futimes,
    rename: rename,
    symlink: symlink,
    readlink: readlink,
    lstat: lstat,
    truncate: truncate,
    ftruncate: ftruncate
  };

});

define('src/filesystem/interface',['require','nodash','src/path','src/shared','src/constants','src/constants','src/constants','src/constants','src/constants','src/providers/providers','src/adapters/adapters','src/shell/shell','intercom','src/fs-watcher','src/errors','src/filesystem/implementation'],function(require) {

  var _ = require('nodash');

  var isNullPath = require('src/path').isNull;
  var nop = require('src/shared').nop;

  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FS_FORMAT = require('src/constants').FS_FORMAT;
  var FS_READY = require('src/constants').FS_READY;
  var FS_PENDING = require('src/constants').FS_PENDING;
  var FS_ERROR = require('src/constants').FS_ERROR;

  var providers = require('src/providers/providers');
  var adapters = require('src/adapters/adapters');

  var Shell = require('src/shell/shell');
  var Intercom = require('intercom');
  var FSWatcher = require('src/fs-watcher');
  var Errors = require('src/errors');

  // The core fs operations live on impl
  var impl = require('src/filesystem/implementation');

  // node.js supports a calling pattern that leaves off a callback.
  function maybeCallback(callback) {
    if(typeof callback === "function") {
      return callback;
    }
    return function(err) {
      if(err) {
        throw err;
      }
    };
  }

  /**
   * FileSystem
   *
   * A FileSystem takes an `options` object, which can specify a number of,
   * options.  All options are optional, and include:
   *
   * name: the name of the file system, defaults to "local"
   *
   * flags: one or more flags to use when creating/opening the file system.
   *        For example: "FORMAT" will cause the file system to be formatted.
   *        No explicit flags are set by default.
   *
   * provider: an explicit storage provider to use for the file
   *           system's database context provider.  A number of context
   *           providers are included (see /src/providers), and users
   *           can write one of their own and pass it in to be used.
   *           By default an IndexedDB provider is used.
   *
   * callback: a callback function to be executed when the file system becomes
   *           ready for use. Depending on the context provider used, this might
   *           be right away, or could take some time. The callback should expect
   *           an `error` argument, which will be null if everything worked.  Also
   *           users should check the file system's `readyState` and `error`
   *           properties to make sure it is usable.
   */
  function FileSystem(options, callback) {
    options = options || {};
    callback = callback || nop;

    var flags = options.flags;
    var provider = options.provider || new providers.Default(options.name || FILE_SYSTEM_NAME);
    // If we're given a provider, match its name unless we get an explicit name
    var name = options.name || provider.name;
    var forceFormatting = _(flags).contains(FS_FORMAT);

    var fs = this;
    fs.readyState = FS_PENDING;
    fs.name = name;
    fs.error = null;

    // Safely expose the list of open files and file
    // descriptor management functions
    var openFiles = {};
    var nextDescriptor = 1;
    Object.defineProperty(this, "openFiles", {
      get: function() { return openFiles; }
    });
    this.allocDescriptor = function(openFileDescription) {
      var fd = nextDescriptor ++;
      openFiles[fd] = openFileDescription;
      return fd;
    };
    this.releaseDescriptor = function(fd) {
      delete openFiles[fd];
    };

    // Safely expose the operation queue
    var queue = [];
    this.queueOrRun = function(operation) {
      var error;

      if(FS_READY == fs.readyState) {
        operation.call(fs);
      } else if(FS_ERROR == fs.readyState) {
        error = new Errors.EFILESYSTEMERROR('unknown error');
      } else {
        queue.push(operation);
      }

      return error;
    };
    function runQueued() {
      queue.forEach(function(operation) {
        operation.call(this);
      }.bind(fs));
      queue = null;
    }

    // We support the optional `options` arg from node, but ignore it
    this.watch = function(filename, options, listener) {
      if(isNullPath(filename)) {
        throw new Error('Path must be a string without null bytes.');
      }
      if(typeof options === 'function') {
        listener = options;
        options = {};
      }
      options = options || {};
      listener = listener || nop;

      var watcher = new FSWatcher();
      watcher.start(filename, false, options.recursive);
      watcher.on('change', listener);

      return watcher;
    };

    // Let other instances (in this or other windows) know about
    // any changes to this fs instance.
    function broadcastChanges(changes) {
      if(!changes.length) {
        return;
      }
      var intercom = Intercom.getInstance();
      changes.forEach(function(change) {
        intercom.emit(change.event, change.path);
      });
    }

    // Open file system storage provider
    provider.open(function(err, needsFormatting) {
      function complete(error) {

        function wrappedContext(methodName) {
          var context = provider[methodName]();
          context.flags = flags;
          context.changes = [];

          // When the context is finished, let the fs deal with any change events
          context.close = function() {
            var changes = context.changes;
            broadcastChanges(changes);
            changes.length = 0;
          };

          return context;
        }

        // Wrap the provider so we can extend the context with fs flags and
        // an array of changes (e.g., watch event 'change' and 'rename' events
        // for paths updated during the lifetime of the context). From this
        // point forward we won't call open again, so it's safe to drop it.
        fs.provider = {
          openReadWriteContext: function() {
            return wrappedContext('getReadWriteContext');
          },
          openReadOnlyContext: function() {
            return wrappedContext('getReadOnlyContext');
          }
        };

        if(error) {
          fs.readyState = FS_ERROR;
        } else {
          fs.readyState = FS_READY;
          runQueued();
        }
        callback(error, fs);
      }

      if(err) {
        return complete(err);
      }

      // If we don't need or want formatting, we're done
      if(!(forceFormatting || needsFormatting)) {
        return complete(null);
      }
      // otherwise format the fs first
      var context = provider.getReadWriteContext();
      context.clear(function(err) {
        if(err) {
          complete(err);
          return;
        }
        impl.makeRootDirectory(context, complete);
      });
    });
  }

  // Expose storage providers on FileSystem constructor
  FileSystem.providers = providers;

  // Expose adatpers on FileSystem constructor
  FileSystem.adapters = adapters;

  /**
   * Public API for FileSystem
   */
  [
    'open',
    'close',
    'mkdir',
    'rmdir',
    'stat',
    'fstat',
    'link',
    'unlink',
    'read',
    'readFile',
    'write',
    'writeFile',
    'appendFile',
    'exists',
    'lseek',
    'readdir',
    'rename',
    'readlink',
    'symlink',
    'lstat',
    'truncate',
    'ftruncate',
    'utimes',
    'futimes',
    'setxattr',
    'getxattr',
    'fsetxattr',
    'fgetxattr',
    'removexattr',
    'fremovexattr'
  ].forEach(function(methodName) {
    FileSystem.prototype[methodName] = function() {
      var fs = this;
      var args = Array.prototype.slice.call(arguments, 0);
      var lastArgIndex = args.length - 1;

      // We may or may not get a callback, and since node.js supports
      // fire-and-forget style fs operations, we have to dance a bit here.
      var missingCallback = typeof args[lastArgIndex] !== 'function';
      var callback = maybeCallback(args[lastArgIndex]);

      var error = fs.queueOrRun(function() {
        var context = fs.provider.openReadWriteContext();

        // Wrap the callback so we can explicitly close the context
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }

        // Either add or replace the callback with our wrapper complete()
        if(missingCallback) {
          args.push(complete);
        } else {
          args[lastArgIndex] = complete;
        }

        // Forward this call to the impl's version, using the following
        // call signature, with complete() as the callback/last-arg now:
        // fn(fs, context, arg0, arg1, ... , complete);
        var fnArgs = [fs, context].concat(args);
        impl[methodName].apply(null, fnArgs);
      });
      if(error) {
        callback(error);
      }
    };
  });

  FileSystem.prototype.Shell = function(options) {
    return new Shell(this, options);
  };

  return FileSystem;

});

define('src/index',['require','src/filesystem/interface','src/path','src/errors'],function(require) {
  return {
    FileSystem: require('src/filesystem/interface'),
    Path: require('src/path'),
    Errors: require('src/errors')
  };
});


  var Filer = require( "src/index" );

  return Filer;

}));

