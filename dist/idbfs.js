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

  if ( typeof exports === "object" ) {
    // Node
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define( factory );
  } else if( !root.IDBFS ) {
    // Browser globals
    root.IDBFS = factory();
  }

}( this, function() {

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("build/almond", function(){});

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
    if (path && trailingSlash) {
      path += '/';
    }

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
    extname: extname
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

  return {
    guid: guid,
    hash: hash,
    nop: nop
  };

});

/*
Copyright (c) 2012, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

define('src/error',['require'],function(require) {
  // 

  function EExists(message){
    this.message = message || '';
  }
  EExists.prototype = new Error();
  EExists.prototype.name = "EExists";
  EExists.prototype.constructor = EExists;

  function EIsDirectory(message){
    this.message = message || '';
  }
  EIsDirectory.prototype = new Error();
  EIsDirectory.prototype.name = "EIsDirectory";
  EIsDirectory.prototype.constructor = EIsDirectory;

  function ENoEntry(message){
    this.message = message || '';
  }
  ENoEntry.prototype = new Error();
  ENoEntry.prototype.name = "ENoEntry";
  ENoEntry.prototype.constructor = ENoEntry;

  function EBusy(message){
    this.message = message || '';
  }
  EBusy.prototype = new Error();
  EBusy.prototype.name = "EBusy";
  EBusy.prototype.constructor = EBusy;

  function ENotEmpty(message){
    this.message = message || '';
  }
  ENotEmpty.prototype = new Error();
  ENotEmpty.prototype.name = "ENotEmpty";
  ENotEmpty.prototype.constructor = ENotEmpty;

  function ENotDirectory(message){
    this.message = message || '';
  }
  ENotDirectory.prototype = new Error();
  ENotDirectory.prototype.name = "ENotDirectory";
  ENotDirectory.prototype.constructor = ENotDirectory;

  function EBadFileDescriptor(message){
    this.message = message || '';
  }
  EBadFileDescriptor.prototype = new Error();
  EBadFileDescriptor.prototype.name = "EBadFileDescriptor";
  EBadFileDescriptor.prototype.constructor = EBadFileDescriptor;

  function ENotImplemented(message){
    this.message = message || '';
  }
  ENotImplemented.prototype = new Error();
  ENotImplemented.prototype.name = "ENotImplemented";
  ENotImplemented.prototype.constructor = ENotImplemented;

  function ENotMounted(message){
    this.message = message || '';
  }
  ENotMounted.prototype = new Error();
  ENotMounted.prototype.name = "ENotMounted";
  ENotMounted.prototype.constructor = ENotMounted;

  function EInvalid(message){
    this.message = message || '';
  }
  EInvalid.prototype = new Error();
  EInvalid.prototype.name = "EInvalid";
  EInvalid.prototype.constructor = EInvalid;

  function EIO(message){
    this.message = message || '';
  }
  EIO.prototype = new Error();
  EIO.prototype.name = "EIO";
  EIO.prototype.constructor = EIO;

  function ELoop(message){
    this.message = message || '';
  }
  ELoop.prototype = new Error();
  ELoop.prototype.name = "ELoop";
  ELoop.prototype.constructor = ELoop;

  function EFileSystemError(message){
    this.message = message || '';
  }
  EFileSystemError.prototype = new Error();
  EFileSystemError.prototype.name = "EFileSystemError";
  EFileSystemError.prototype.constructor = EFileSystemError;

  return {
    EExists: EExists,
    EIsDirectory: EIsDirectory,
    ENoEntry: ENoEntry,
    EBusy: EBusy,
    ENotEmpty: ENotEmpty,
    ENotDirectory: ENotDirectory,
    EBadFileDescriptor: EBadFileDescriptor,
    ENotImplemented: ENotImplemented,
    ENotMounted: ENotMounted,
    EInvalid: EInvalid,
    EIO: EIO,
    ELoop: ELoop
  };

});

define('src/constants',['require'],function(require) {

  var O_READ = 'READ';
  var O_WRITE = 'WRITE';
  var O_CREATE = 'CREATE';
  var O_EXCLUSIVE = 'EXCLUSIVE';
  var O_TRUNCATE = 'TRUNCATE';
  var O_APPEND = 'APPEND';

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

    SYMLOOP_MAX: 10,

    BINARY_MIME_TYPE: 'application/octet-stream',
    JSON_MIME_TYPE: 'application/json',

    ROOT_DIRECTORY_NAME: '/', // basename(normalize(path))
    ROOT_NODE_ID: '8a5edab282632443219e051e4ade2d1d5bbc671c781051bf1437897cbdfea0f1', // sha256(ROOT_DIRECTORY_NAME)

    FS_FORMAT: 'FORMAT',

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

    FS_READY: 'READY',
    FS_PENDING: 'PENDING',
    FS_ERROR: 'ERROR'
  };

});
define('src/providers/indexeddb',['require','src/constants','src/constants','src/constants','src/constants'],function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;

  var indexedDB = window.indexedDB       ||
                  window.mozIndexedDB    ||
                  window.webkitIndexedDB ||
                  window.msIndexedDB;

  var IDB_RW = require('src/constants').IDB_RW;
  var IDB_RO = require('src/constants').IDB_RO;

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
      callback(error);
    };
  };
  IndexedDB.prototype.getReadOnlyContext = function() {
    return new IndexedDBContext(this.db, IDB_RO);
  };
  IndexedDB.prototype.getReadWriteContext = function() {
    return new IndexedDBContext(this.db, IDB_RW);
  };

  return IndexedDB;
});

define('src/providers/websql',['require','src/constants','src/constants','src/constants','src/constants','src/constants'],function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;
  var WSQL_VERSION = require('src/constants').WSQL_VERSION;
  var WSQL_SIZE = require('src/constants').WSQL_SIZE;
  var WSQL_DESC = require('src/constants').WSQL_DESC;

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
      transaction.executeSql("DELETE FROM " + FILE_STORE_NAME,
                             [], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.get = function(key, callback) {
    function onSuccess(transaction, result) {
      // If the key isn't found, return null
      var value = result.rows.length === 0 ? null : result.rows.item(0).data;
      callback(null, value);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("SELECT data FROM " + FILE_STORE_NAME + " WHERE id = ?",
                             [key], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.put = function(key, value, callback) {
    function onSuccess(transaction, result) {
      callback(null);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("INSERT OR REPLACE INTO " + FILE_STORE_NAME + " (id, data) VALUES (?, ?)",
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
      transaction.executeSql("DELETE FROM " + FILE_STORE_NAME + " WHERE id = ?",
                             [key], onSuccess, onError);
    });
  };


  function WebSQL(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = null;
  }
  WebSQL.isSupported = function() {
    return !!window.openDatabase;
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

    db.transaction(function(transaction) {
      transaction.executeSql("CREATE TABLE IF NOT EXISTS " + FILE_STORE_NAME + " (id unique, data)",
                             [], onSuccess, onError);
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

define('src/providers/memory',['require','src/constants'],function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;

  function MemoryContext(db, readOnly) {
    this.readOnly = readOnly;
    this.objectStore = db;
  }
  MemoryContext.prototype.clear = function(callback) {
    if(this.readOnly) {
      return callback("[MemoryContext] Error: write operation on read only context");
    }
    var objectStore = this.objectStore;
    Object.keys(objectStore).forEach(function(key){
      delete objectStore[key];
    });
    callback(null);
  };
  MemoryContext.prototype.get = function(key, callback) {
    callback(null, this.objectStore[key]);
  };
  MemoryContext.prototype.put = function(key, value, callback) {
    if(this.readOnly) {
      return callback("[MemoryContext] Error: write operation on read only context");
    }
    this.objectStore[key] = value;
    callback(null);
  };
  MemoryContext.prototype.delete = function(key, callback) {
    if(this.readOnly) {
      return callback("[MemoryContext] Error: write operation on read only context");
    }
    delete this.objectStore[key];
    callback(null);
  };


  function Memory(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = {};
  }
  Memory.isSupported = function() {
    return true;
  };

  Memory.prototype.open = function(callback) {
    callback(null, true);
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
        throw "[IDBFS Error] Your browser doesn't support IndexedDB or WebSQL.";
      }
      NotSupported.isSupported = function() {
        return false;
      };
      return NotSupported;
    }())
  };
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

/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(q,i){var h={},j=h.lib={},p=j.Base=function(){function a(){}return{extend:function(c){a.prototype=this;var b=new a;c&&b.mixIn(c);b.$super=this;return b},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var b in a)a.hasOwnProperty(b)&&(this[b]=a[b]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.$super.extend(this)}}}(),l=j.WordArray=p.extend({init:function(a,c){a=
this.words=a||[];this.sigBytes=c!=i?c:4*a.length},toString:function(a){return(a||r).stringify(this)},concat:function(a){var c=this.words,b=a.words,g=this.sigBytes,a=a.sigBytes;this.clamp();if(g%4)for(var e=0;e<a;e++)c[g+e>>>2]|=(b[e>>>2]>>>24-8*(e%4)&255)<<24-8*((g+e)%4);else if(65535<b.length)for(e=0;e<a;e+=4)c[g+e>>>2]=b[e>>>2];else c.push.apply(c,b);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<32-8*(c%4);a.length=q.ceil(c/4)},clone:function(){var a=
p.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],b=0;b<a;b+=4)c.push(4294967296*q.random()|0);return l.create(c,a)}}),k=h.enc={},r=k.Hex={stringify:function(a){for(var c=a.words,a=a.sigBytes,b=[],g=0;g<a;g++){var e=c[g>>>2]>>>24-8*(g%4)&255;b.push((e>>>4).toString(16));b.push((e&15).toString(16))}return b.join("")},parse:function(a){for(var c=a.length,b=[],g=0;g<c;g+=2)b[g>>>3]|=parseInt(a.substr(g,2),16)<<24-4*(g%8);return l.create(b,c/2)}},o=k.Latin1={stringify:function(a){for(var c=
a.words,a=a.sigBytes,b=[],g=0;g<a;g++)b.push(String.fromCharCode(c[g>>>2]>>>24-8*(g%4)&255));return b.join("")},parse:function(a){for(var c=a.length,b=[],g=0;g<c;g++)b[g>>>2]|=(a.charCodeAt(g)&255)<<24-8*(g%4);return l.create(b,c)}},m=k.Utf8={stringify:function(a){try{return decodeURIComponent(escape(o.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return o.parse(unescape(encodeURIComponent(a)))}},d=j.BufferedBlockAlgorithm=p.extend({reset:function(){this._data=l.create();
this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=m.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,b=c.words,g=c.sigBytes,e=this.blockSize,n=g/(4*e),n=a?q.ceil(n):q.max((n|0)-this._minBufferSize,0),a=n*e,g=q.min(4*a,g);if(a){for(var d=0;d<a;d+=e)this._doProcessBlock(b,d);d=b.splice(0,a);c.sigBytes-=g}return l.create(d,g)},clone:function(){var a=p.clone.call(this);a._data=this._data.clone();return a},_minBufferSize:0});j.Hasher=d.extend({init:function(){this.reset()},
reset:function(){d.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);this._doFinalize();return this._hash},clone:function(){var a=d.clone.call(this);a._hash=this._hash.clone();return a},blockSize:16,_createHelper:function(a){return function(c,b){return a.create(b).finalize(c)}},_createHmacHelper:function(a){return function(c,b){return f.HMAC.create(a,b).finalize(c)}}});var f=h.algo={};return h}(Math);
(function(){var q=CryptoJS,i=q.lib.WordArray;q.enc.Base64={stringify:function(h){var j=h.words,i=h.sigBytes,l=this._map;h.clamp();for(var h=[],k=0;k<i;k+=3)for(var r=(j[k>>>2]>>>24-8*(k%4)&255)<<16|(j[k+1>>>2]>>>24-8*((k+1)%4)&255)<<8|j[k+2>>>2]>>>24-8*((k+2)%4)&255,o=0;4>o&&k+0.75*o<i;o++)h.push(l.charAt(r>>>6*(3-o)&63));if(j=l.charAt(64))for(;h.length%4;)h.push(j);return h.join("")},parse:function(h){var h=h.replace(/\s/g,""),j=h.length,p=this._map,l=p.charAt(64);l&&(l=h.indexOf(l),-1!=l&&(j=l));
for(var l=[],k=0,r=0;r<j;r++)if(r%4){var o=p.indexOf(h.charAt(r-1))<<2*(r%4),m=p.indexOf(h.charAt(r))>>>6-2*(r%4);l[k>>>2]|=(o|m)<<24-8*(k%4);k++}return i.create(l,k)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
(function(q){function i(d,f,a,c,b,g,e){d=d+(f&a|~f&c)+b+e;return(d<<g|d>>>32-g)+f}function h(d,f,a,c,b,g,e){d=d+(f&c|a&~c)+b+e;return(d<<g|d>>>32-g)+f}function j(d,f,a,c,b,g,e){d=d+(f^a^c)+b+e;return(d<<g|d>>>32-g)+f}function p(d,f,a,c,b,g,e){d=d+(a^(f|~c))+b+e;return(d<<g|d>>>32-g)+f}var l=CryptoJS,k=l.lib,r=k.WordArray,k=k.Hasher,o=l.algo,m=[];(function(){for(var d=0;64>d;d++)m[d]=4294967296*q.abs(q.sin(d+1))|0})();o=o.MD5=k.extend({_doReset:function(){this._hash=r.create([1732584193,4023233417,
2562383102,271733878])},_doProcessBlock:function(d,f){for(var a=0;16>a;a++){var c=f+a,b=d[c];d[c]=(b<<8|b>>>24)&16711935|(b<<24|b>>>8)&4278255360}for(var c=this._hash.words,b=c[0],g=c[1],e=c[2],n=c[3],a=0;64>a;a+=4)16>a?(b=i(b,g,e,n,d[f+a],7,m[a]),n=i(n,b,g,e,d[f+a+1],12,m[a+1]),e=i(e,n,b,g,d[f+a+2],17,m[a+2]),g=i(g,e,n,b,d[f+a+3],22,m[a+3])):32>a?(b=h(b,g,e,n,d[f+(a+1)%16],5,m[a]),n=h(n,b,g,e,d[f+(a+6)%16],9,m[a+1]),e=h(e,n,b,g,d[f+(a+11)%16],14,m[a+2]),g=h(g,e,n,b,d[f+a%16],20,m[a+3])):48>a?(b=
j(b,g,e,n,d[f+(3*a+5)%16],4,m[a]),n=j(n,b,g,e,d[f+(3*a+8)%16],11,m[a+1]),e=j(e,n,b,g,d[f+(3*a+11)%16],16,m[a+2]),g=j(g,e,n,b,d[f+(3*a+14)%16],23,m[a+3])):(b=p(b,g,e,n,d[f+3*a%16],6,m[a]),n=p(n,b,g,e,d[f+(3*a+7)%16],10,m[a+1]),e=p(e,n,b,g,d[f+(3*a+14)%16],15,m[a+2]),g=p(g,e,n,b,d[f+(3*a+5)%16],21,m[a+3]));c[0]=c[0]+b|0;c[1]=c[1]+g|0;c[2]=c[2]+e|0;c[3]=c[3]+n|0},_doFinalize:function(){var d=this._data,f=d.words,a=8*this._nDataBytes,c=8*d.sigBytes;f[c>>>5]|=128<<24-c%32;f[(c+64>>>9<<4)+14]=(a<<8|a>>>
24)&16711935|(a<<24|a>>>8)&4278255360;d.sigBytes=4*(f.length+1);this._process();d=this._hash.words;for(f=0;4>f;f++)a=d[f],d[f]=(a<<8|a>>>24)&16711935|(a<<24|a>>>8)&4278255360}});l.MD5=k._createHelper(o);l.HmacMD5=k._createHmacHelper(o)})(Math);
(function(){var q=CryptoJS,i=q.lib,h=i.Base,j=i.WordArray,i=q.algo,p=i.EvpKDF=h.extend({cfg:h.extend({keySize:4,hasher:i.MD5,iterations:1}),init:function(h){this.cfg=this.cfg.extend(h)},compute:function(h,k){for(var i=this.cfg,o=i.hasher.create(),m=j.create(),d=m.words,f=i.keySize,i=i.iterations;d.length<f;){a&&o.update(a);var a=o.update(h).finalize(k);o.reset();for(var c=1;c<i;c++)a=o.finalize(a),o.reset();m.concat(a)}m.sigBytes=4*f;return m}});q.EvpKDF=function(h,i,j){return p.create(j).compute(h,
i)}})();
CryptoJS.lib.Cipher||function(q){var i=CryptoJS,h=i.lib,j=h.Base,p=h.WordArray,l=h.BufferedBlockAlgorithm,k=i.enc.Base64,r=i.algo.EvpKDF,o=h.Cipher=l.extend({cfg:j.extend(),createEncryptor:function(a,e){return this.create(this._ENC_XFORM_MODE,a,e)},createDecryptor:function(a,e){return this.create(this._DEC_XFORM_MODE,a,e)},init:function(a,e,b){this.cfg=this.cfg.extend(b);this._xformMode=a;this._key=e;this.reset()},reset:function(){l.reset.call(this);this._doReset()},process:function(a){this._append(a);return this._process()},
finalize:function(a){a&&this._append(a);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(){return function(a){return{encrypt:function(e,n,d){return("string"==typeof n?b:c).encrypt(a,e,n,d)},decrypt:function(e,n,d){return("string"==typeof n?b:c).decrypt(a,e,n,d)}}}}()});h.StreamCipher=o.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var m=i.mode={},d=h.BlockCipherMode=j.extend({createEncryptor:function(a,e){return this.Encryptor.create(a,
e)},createDecryptor:function(a,e){return this.Decryptor.create(a,e)},init:function(a,e){this._cipher=a;this._iv=e}}),m=m.CBC=function(){function a(g,e,b){var c=this._iv;c?this._iv=q:c=this._prevBlock;for(var d=0;d<b;d++)g[e+d]^=c[d]}var e=d.extend();e.Encryptor=e.extend({processBlock:function(e,b){var c=this._cipher,d=c.blockSize;a.call(this,e,b,d);c.encryptBlock(e,b);this._prevBlock=e.slice(b,b+d)}});e.Decryptor=e.extend({processBlock:function(e,b){var c=this._cipher,d=c.blockSize,f=e.slice(b,b+
d);c.decryptBlock(e,b);a.call(this,e,b,d);this._prevBlock=f}});return e}(),f=(i.pad={}).Pkcs7={pad:function(a,e){for(var b=4*e,b=b-a.sigBytes%b,c=b<<24|b<<16|b<<8|b,d=[],f=0;f<b;f+=4)d.push(c);b=p.create(d,b);a.concat(b)},unpad:function(a){a.sigBytes-=a.words[a.sigBytes-1>>>2]&255}};h.BlockCipher=o.extend({cfg:o.cfg.extend({mode:m,padding:f}),reset:function(){o.reset.call(this);var a=this.cfg,e=a.iv,a=a.mode;if(this._xformMode==this._ENC_XFORM_MODE)var b=a.createEncryptor;else b=a.createDecryptor,
this._minBufferSize=1;this._mode=b.call(a,this,e&&e.words)},_doProcessBlock:function(a,b){this._mode.processBlock(a,b)},_doFinalize:function(){var a=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){a.pad(this._data,this.blockSize);var b=this._process(!0)}else b=this._process(!0),a.unpad(b);return b},blockSize:4});var a=h.CipherParams=j.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),m=(i.format={}).OpenSSL={stringify:function(a){var b=
a.ciphertext,a=a.salt,b=(a?p.create([1398893684,1701076831]).concat(a).concat(b):b).toString(k);return b=b.replace(/(.{64})/g,"$1\n")},parse:function(b){var b=k.parse(b),e=b.words;if(1398893684==e[0]&&1701076831==e[1]){var c=p.create(e.slice(2,4));e.splice(0,4);b.sigBytes-=16}return a.create({ciphertext:b,salt:c})}},c=h.SerializableCipher=j.extend({cfg:j.extend({format:m}),encrypt:function(b,e,c,d){var d=this.cfg.extend(d),f=b.createEncryptor(c,d),e=f.finalize(e),f=f.cfg;return a.create({ciphertext:e,
key:c,iv:f.iv,algorithm:b,mode:f.mode,padding:f.padding,blockSize:b.blockSize,formatter:d.format})},decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);return a.createDecryptor(c,d).finalize(b.ciphertext)},_parse:function(a,b){return"string"==typeof a?b.parse(a):a}}),i=(i.kdf={}).OpenSSL={compute:function(b,c,d,f){f||(f=p.random(8));b=r.create({keySize:c+d}).compute(b,f);d=p.create(b.words.slice(c),4*d);b.sigBytes=4*c;return a.create({key:b,iv:d,salt:f})}},b=h.PasswordBasedCipher=
c.extend({cfg:c.cfg.extend({kdf:i}),encrypt:function(a,b,d,f){f=this.cfg.extend(f);d=f.kdf.compute(d,a.keySize,a.ivSize);f.iv=d.iv;a=c.encrypt.call(this,a,b,d.key,f);a.mixIn(d);return a},decrypt:function(a,b,d,f){f=this.cfg.extend(f);b=this._parse(b,f.format);d=f.kdf.compute(d,a.keySize,a.ivSize,b.salt);f.iv=d.iv;return c.decrypt.call(this,a,b,d.key,f)}})}();
(function(){function q(a,c){var b=(this._lBlock>>>a^this._rBlock)&c;this._rBlock^=b;this._lBlock^=b<<a}function i(a,c){var b=(this._rBlock>>>a^this._lBlock)&c;this._lBlock^=b;this._rBlock^=b<<a}var h=CryptoJS,j=h.lib,p=j.WordArray,j=j.BlockCipher,l=h.algo,k=[57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4],r=[14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,
55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32],o=[1,2,4,6,8,10,12,14,15,17,19,21,23,25,27,28],m=[{"0":8421888,268435456:32768,536870912:8421378,805306368:2,1073741824:512,1342177280:8421890,1610612736:8389122,1879048192:8388608,2147483648:514,2415919104:8389120,2684354560:33280,2952790016:8421376,3221225472:32770,3489660928:8388610,3758096384:0,4026531840:33282,134217728:0,402653184:8421890,671088640:33282,939524096:32768,1207959552:8421888,1476395008:512,1744830464:8421378,2013265920:2,
2281701376:8389120,2550136832:33280,2818572288:8421376,3087007744:8389122,3355443200:8388610,3623878656:32770,3892314112:514,4160749568:8388608,1:32768,268435457:2,536870913:8421888,805306369:8388608,1073741825:8421378,1342177281:33280,1610612737:512,1879048193:8389122,2147483649:8421890,2415919105:8421376,2684354561:8388610,2952790017:33282,3221225473:514,3489660929:8389120,3758096385:32770,4026531841:0,134217729:8421890,402653185:8421376,671088641:8388608,939524097:512,1207959553:32768,1476395009:8388610,
1744830465:2,2013265921:33282,2281701377:32770,2550136833:8389122,2818572289:514,3087007745:8421888,3355443201:8389120,3623878657:0,3892314113:33280,4160749569:8421378},{"0":1074282512,16777216:16384,33554432:524288,50331648:1074266128,67108864:1073741840,83886080:1074282496,100663296:1073758208,117440512:16,134217728:540672,150994944:1073758224,167772160:1073741824,184549376:540688,201326592:524304,218103808:0,234881024:16400,251658240:1074266112,8388608:1073758208,25165824:540688,41943040:16,58720256:1073758224,
75497472:1074282512,92274688:1073741824,109051904:524288,125829120:1074266128,142606336:524304,159383552:0,176160768:16384,192937984:1074266112,209715200:1073741840,226492416:540672,243269632:1074282496,260046848:16400,268435456:0,285212672:1074266128,301989888:1073758224,318767104:1074282496,335544320:1074266112,352321536:16,369098752:540688,385875968:16384,402653184:16400,419430400:524288,436207616:524304,452984832:1073741840,469762048:540672,486539264:1073758208,503316480:1073741824,520093696:1074282512,
276824064:540688,293601280:524288,310378496:1074266112,327155712:16384,343932928:1073758208,360710144:1074282512,377487360:16,394264576:1073741824,411041792:1074282496,427819008:1073741840,444596224:1073758224,461373440:524304,478150656:0,494927872:16400,511705088:1074266128,528482304:540672},{"0":260,1048576:0,2097152:67109120,3145728:65796,4194304:65540,5242880:67108868,6291456:67174660,7340032:67174400,8388608:67108864,9437184:67174656,10485760:65792,11534336:67174404,12582912:67109124,13631488:65536,
14680064:4,15728640:256,524288:67174656,1572864:67174404,2621440:0,3670016:67109120,4718592:67108868,5767168:65536,6815744:65540,7864320:260,8912896:4,9961472:256,11010048:67174400,12058624:65796,13107200:65792,14155776:67109124,15204352:67174660,16252928:67108864,16777216:67174656,17825792:65540,18874368:65536,19922944:67109120,20971520:256,22020096:67174660,23068672:67108868,24117248:0,25165824:67109124,26214400:67108864,27262976:4,28311552:65792,29360128:67174400,30408704:260,31457280:65796,32505856:67174404,
17301504:67108864,18350080:260,19398656:67174656,20447232:0,21495808:65540,22544384:67109120,23592960:256,24641536:67174404,25690112:65536,26738688:67174660,27787264:65796,28835840:67108868,29884416:67109124,30932992:67174400,31981568:4,33030144:65792},{"0":2151682048,65536:2147487808,131072:4198464,196608:2151677952,262144:0,327680:4198400,393216:2147483712,458752:4194368,524288:2147483648,589824:4194304,655360:64,720896:2147487744,786432:2151678016,851968:4160,917504:4096,983040:2151682112,32768:2147487808,
98304:64,163840:2151678016,229376:2147487744,294912:4198400,360448:2151682112,425984:0,491520:2151677952,557056:4096,622592:2151682048,688128:4194304,753664:4160,819200:2147483648,884736:4194368,950272:4198464,1015808:2147483712,1048576:4194368,1114112:4198400,1179648:2147483712,1245184:0,1310720:4160,1376256:2151678016,1441792:2151682048,1507328:2147487808,1572864:2151682112,1638400:2147483648,1703936:2151677952,1769472:4198464,1835008:2147487744,1900544:4194304,1966080:64,2031616:4096,1081344:2151677952,
1146880:2151682112,1212416:0,1277952:4198400,1343488:4194368,1409024:2147483648,1474560:2147487808,1540096:64,1605632:2147483712,1671168:4096,1736704:2147487744,1802240:2151678016,1867776:4160,1933312:2151682048,1998848:4194304,2064384:4198464},{"0":128,4096:17039360,8192:262144,12288:536870912,16384:537133184,20480:16777344,24576:553648256,28672:262272,32768:16777216,36864:537133056,40960:536871040,45056:553910400,49152:553910272,53248:0,57344:17039488,61440:553648128,2048:17039488,6144:553648256,
10240:128,14336:17039360,18432:262144,22528:537133184,26624:553910272,30720:536870912,34816:537133056,38912:0,43008:553910400,47104:16777344,51200:536871040,55296:553648128,59392:16777216,63488:262272,65536:262144,69632:128,73728:536870912,77824:553648256,81920:16777344,86016:553910272,90112:537133184,94208:16777216,98304:553910400,102400:553648128,106496:17039360,110592:537133056,114688:262272,118784:536871040,122880:0,126976:17039488,67584:553648256,71680:16777216,75776:17039360,79872:537133184,
83968:536870912,88064:17039488,92160:128,96256:553910272,100352:262272,104448:553910400,108544:0,112640:553648128,116736:16777344,120832:262144,124928:537133056,129024:536871040},{"0":268435464,256:8192,512:270532608,768:270540808,1024:268443648,1280:2097152,1536:2097160,1792:268435456,2048:0,2304:268443656,2560:2105344,2816:8,3072:270532616,3328:2105352,3584:8200,3840:270540800,128:270532608,384:270540808,640:8,896:2097152,1152:2105352,1408:268435464,1664:268443648,1920:8200,2176:2097160,2432:8192,
2688:268443656,2944:270532616,3200:0,3456:270540800,3712:2105344,3968:268435456,4096:268443648,4352:270532616,4608:270540808,4864:8200,5120:2097152,5376:268435456,5632:268435464,5888:2105344,6144:2105352,6400:0,6656:8,6912:270532608,7168:8192,7424:268443656,7680:270540800,7936:2097160,4224:8,4480:2105344,4736:2097152,4992:268435464,5248:268443648,5504:8200,5760:270540808,6016:270532608,6272:270540800,6528:270532616,6784:8192,7040:2105352,7296:2097160,7552:0,7808:268435456,8064:268443656},{"0":1048576,
16:33555457,32:1024,48:1049601,64:34604033,80:0,96:1,112:34603009,128:33555456,144:1048577,160:33554433,176:34604032,192:34603008,208:1025,224:1049600,240:33554432,8:34603009,24:0,40:33555457,56:34604032,72:1048576,88:33554433,104:33554432,120:1025,136:1049601,152:33555456,168:34603008,184:1048577,200:1024,216:34604033,232:1,248:1049600,256:33554432,272:1048576,288:33555457,304:34603009,320:1048577,336:33555456,352:34604032,368:1049601,384:1025,400:34604033,416:1049600,432:1,448:0,464:34603008,480:33554433,
496:1024,264:1049600,280:33555457,296:34603009,312:1,328:33554432,344:1048576,360:1025,376:34604032,392:33554433,408:34603008,424:0,440:34604033,456:1049601,472:1024,488:33555456,504:1048577},{"0":134219808,1:131072,2:134217728,3:32,4:131104,5:134350880,6:134350848,7:2048,8:134348800,9:134219776,10:133120,11:134348832,12:2080,13:0,14:134217760,15:133152,2147483648:2048,2147483649:134350880,2147483650:134219808,2147483651:134217728,2147483652:134348800,2147483653:133120,2147483654:133152,2147483655:32,
2147483656:134217760,2147483657:2080,2147483658:131104,2147483659:134350848,2147483660:0,2147483661:134348832,2147483662:134219776,2147483663:131072,16:133152,17:134350848,18:32,19:2048,20:134219776,21:134217760,22:134348832,23:131072,24:0,25:131104,26:134348800,27:134219808,28:134350880,29:133120,30:2080,31:134217728,2147483664:131072,2147483665:2048,2147483666:134348832,2147483667:133152,2147483668:32,2147483669:134348800,2147483670:134217728,2147483671:134219808,2147483672:134350880,2147483673:134217760,
2147483674:134219776,2147483675:0,2147483676:133120,2147483677:2080,2147483678:131104,2147483679:134350848}],d=[4160749569,528482304,33030144,2064384,129024,8064,504,2147483679],f=l.DES=j.extend({_doReset:function(){for(var a=this._key.words,c=[],b=0;56>b;b++){var d=k[b]-1;c[b]=a[d>>>5]>>>31-d%32&1}a=this._subKeys=[];for(d=0;16>d;d++){for(var e=a[d]=[],f=o[d],b=0;24>b;b++)e[b/6|0]|=c[(r[b]-1+f)%28]<<31-b%6,e[4+(b/6|0)]|=c[28+(r[b+24]-1+f)%28]<<31-b%6;e[0]=e[0]<<1|e[0]>>>31;for(b=1;7>b;b++)e[b]>>>=
4*(b-1)+3;e[7]=e[7]<<5|e[7]>>>27}c=this._invSubKeys=[];for(b=0;16>b;b++)c[b]=a[15-b]},encryptBlock:function(a,c){this._doCryptBlock(a,c,this._subKeys)},decryptBlock:function(a,c){this._doCryptBlock(a,c,this._invSubKeys)},_doCryptBlock:function(a,c,b){this._lBlock=a[c];this._rBlock=a[c+1];q.call(this,4,252645135);q.call(this,16,65535);i.call(this,2,858993459);i.call(this,8,16711935);q.call(this,1,1431655765);for(var f=0;16>f;f++){for(var e=b[f],h=this._lBlock,j=this._rBlock,k=0,l=0;8>l;l++)k|=m[l][((j^
e[l])&d[l])>>>0];this._lBlock=j;this._rBlock=h^k}b=this._lBlock;this._lBlock=this._rBlock;this._rBlock=b;q.call(this,1,1431655765);i.call(this,8,16711935);i.call(this,2,858993459);q.call(this,16,65535);q.call(this,4,252645135);a[c]=this._lBlock;a[c+1]=this._rBlock},keySize:2,ivSize:2,blockSize:2});h.DES=j._createHelper(f);l=l.TripleDES=j.extend({_doReset:function(){var a=this._key.words;this._des1=f.createEncryptor(p.create(a.slice(0,2)));this._des2=f.createEncryptor(p.create(a.slice(2,4)));this._des3=
f.createEncryptor(p.create(a.slice(4,6)))},encryptBlock:function(a,c){this._des1.encryptBlock(a,c);this._des2.decryptBlock(a,c);this._des3.encryptBlock(a,c)},decryptBlock:function(a,c){this._des3.decryptBlock(a,c);this._des2.encryptBlock(a,c);this._des1.decryptBlock(a,c)},keySize:6,ivSize:2,blockSize:2});h.TripleDES=j._createHelper(l)})();

define("crypto-js/rollups/tripledes", function(){});

/*
CryptoJS v3.0.2
code.google.com/p/crypto-js
(c) 2009-2012 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(n,l){var i={},j=i.lib={},k=j.Base=function(){function b(){}return{extend:function(p){b.prototype=this;var a=new b;p&&a.mixIn(p);a.$super=this;return a},create:function(){var b=this.extend();b.init.apply(b,arguments);return b},init:function(){},mixIn:function(b){for(var a in b)b.hasOwnProperty(a)&&(this[a]=b[a]);b.hasOwnProperty("toString")&&(this.toString=b.toString)},clone:function(){return this.$super.extend(this)}}}(),e=j.WordArray=k.extend({init:function(b,a){b=
this.words=b||[];this.sigBytes=a!=l?a:4*b.length},toString:function(b){return(b||c).stringify(this)},concat:function(b){var a=this.words,c=b.words,g=this.sigBytes,b=b.sigBytes;this.clamp();if(g%4)for(var h=0;h<b;h++)a[g+h>>>2]|=(c[h>>>2]>>>24-8*(h%4)&255)<<24-8*((g+h)%4);else if(65535<c.length)for(h=0;h<b;h+=4)a[g+h>>>2]=c[h>>>2];else a.push.apply(a,c);this.sigBytes+=b;return this},clamp:function(){var b=this.words,a=this.sigBytes;b[a>>>2]&=4294967295<<32-8*(a%4);b.length=n.ceil(a/4)},clone:function(){var b=
k.clone.call(this);b.words=this.words.slice(0);return b},random:function(b){for(var a=[],c=0;c<b;c+=4)a.push(4294967296*n.random()|0);return e.create(a,b)}}),d=i.enc={},c=d.Hex={stringify:function(b){for(var a=b.words,b=b.sigBytes,c=[],g=0;g<b;g++){var h=a[g>>>2]>>>24-8*(g%4)&255;c.push((h>>>4).toString(16));c.push((h&15).toString(16))}return c.join("")},parse:function(b){for(var a=b.length,c=[],g=0;g<a;g+=2)c[g>>>3]|=parseInt(b.substr(g,2),16)<<24-4*(g%8);return e.create(c,a/2)}},a=d.Latin1={stringify:function(b){for(var a=
b.words,b=b.sigBytes,c=[],g=0;g<b;g++)c.push(String.fromCharCode(a[g>>>2]>>>24-8*(g%4)&255));return c.join("")},parse:function(b){for(var a=b.length,c=[],g=0;g<a;g++)c[g>>>2]|=(b.charCodeAt(g)&255)<<24-8*(g%4);return e.create(c,a)}},f=d.Utf8={stringify:function(b){try{return decodeURIComponent(escape(a.stringify(b)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(b){return a.parse(unescape(encodeURIComponent(b)))}},o=j.BufferedBlockAlgorithm=k.extend({reset:function(){this._data=e.create();
this._nDataBytes=0},_append:function(b){"string"==typeof b&&(b=f.parse(b));this._data.concat(b);this._nDataBytes+=b.sigBytes},_process:function(b){var a=this._data,c=a.words,g=a.sigBytes,h=this.blockSize,m=g/(4*h),m=b?n.ceil(m):n.max((m|0)-this._minBufferSize,0),b=m*h,g=n.min(4*b,g);if(b){for(var o=0;o<b;o+=h)this._doProcessBlock(c,o);o=c.splice(0,b);a.sigBytes-=g}return e.create(o,g)},clone:function(){var b=k.clone.call(this);b._data=this._data.clone();return b},_minBufferSize:0});j.Hasher=o.extend({init:function(){this.reset()},
reset:function(){o.reset.call(this);this._doReset()},update:function(b){this._append(b);this._process();return this},finalize:function(b){b&&this._append(b);this._doFinalize();return this._hash},clone:function(){var b=o.clone.call(this);b._hash=this._hash.clone();return b},blockSize:16,_createHelper:function(b){return function(a,c){return b.create(c).finalize(a)}},_createHmacHelper:function(b){return function(a,c){return q.HMAC.create(b,c).finalize(a)}}});var q=i.algo={};return i}(Math);
(function(){var n=CryptoJS,l=n.lib.WordArray;n.enc.Base64={stringify:function(i){var j=i.words,k=i.sigBytes,e=this._map;i.clamp();for(var i=[],d=0;d<k;d+=3)for(var c=(j[d>>>2]>>>24-8*(d%4)&255)<<16|(j[d+1>>>2]>>>24-8*((d+1)%4)&255)<<8|j[d+2>>>2]>>>24-8*((d+2)%4)&255,a=0;4>a&&d+0.75*a<k;a++)i.push(e.charAt(c>>>6*(3-a)&63));if(j=e.charAt(64))for(;i.length%4;)i.push(j);return i.join("")},parse:function(i){var i=i.replace(/\s/g,""),j=i.length,k=this._map,e=k.charAt(64);e&&(e=i.indexOf(e),-1!=e&&(j=e));
for(var e=[],d=0,c=0;c<j;c++)if(c%4){var a=k.indexOf(i.charAt(c-1))<<2*(c%4),f=k.indexOf(i.charAt(c))>>>6-2*(c%4);e[d>>>2]|=(a|f)<<24-8*(d%4);d++}return l.create(e,d)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
(function(n){function l(a,c,b,d,f,g,h){a=a+(c&b|~c&d)+f+h;return(a<<g|a>>>32-g)+c}function i(a,c,b,d,f,g,h){a=a+(c&d|b&~d)+f+h;return(a<<g|a>>>32-g)+c}function j(a,c,b,d,f,g,h){a=a+(c^b^d)+f+h;return(a<<g|a>>>32-g)+c}function k(a,c,b,d,f,g,h){a=a+(b^(c|~d))+f+h;return(a<<g|a>>>32-g)+c}var e=CryptoJS,d=e.lib,c=d.WordArray,d=d.Hasher,a=e.algo,f=[];(function(){for(var a=0;64>a;a++)f[a]=4294967296*n.abs(n.sin(a+1))|0})();a=a.MD5=d.extend({_doReset:function(){this._hash=c.create([1732584193,4023233417,
2562383102,271733878])},_doProcessBlock:function(a,c){for(var b=0;16>b;b++){var d=c+b,e=a[d];a[d]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360}for(var d=this._hash.words,e=d[0],g=d[1],h=d[2],m=d[3],b=0;64>b;b+=4)16>b?(e=l(e,g,h,m,a[c+b],7,f[b]),m=l(m,e,g,h,a[c+b+1],12,f[b+1]),h=l(h,m,e,g,a[c+b+2],17,f[b+2]),g=l(g,h,m,e,a[c+b+3],22,f[b+3])):32>b?(e=i(e,g,h,m,a[c+(b+1)%16],5,f[b]),m=i(m,e,g,h,a[c+(b+6)%16],9,f[b+1]),h=i(h,m,e,g,a[c+(b+11)%16],14,f[b+2]),g=i(g,h,m,e,a[c+b%16],20,f[b+3])):48>b?(e=
j(e,g,h,m,a[c+(3*b+5)%16],4,f[b]),m=j(m,e,g,h,a[c+(3*b+8)%16],11,f[b+1]),h=j(h,m,e,g,a[c+(3*b+11)%16],16,f[b+2]),g=j(g,h,m,e,a[c+(3*b+14)%16],23,f[b+3])):(e=k(e,g,h,m,a[c+3*b%16],6,f[b]),m=k(m,e,g,h,a[c+(3*b+7)%16],10,f[b+1]),h=k(h,m,e,g,a[c+(3*b+14)%16],15,f[b+2]),g=k(g,h,m,e,a[c+(3*b+5)%16],21,f[b+3]));d[0]=d[0]+e|0;d[1]=d[1]+g|0;d[2]=d[2]+h|0;d[3]=d[3]+m|0},_doFinalize:function(){var a=this._data,c=a.words,b=8*this._nDataBytes,d=8*a.sigBytes;c[d>>>5]|=128<<24-d%32;c[(d+64>>>9<<4)+14]=(b<<8|b>>>
24)&16711935|(b<<24|b>>>8)&4278255360;a.sigBytes=4*(c.length+1);this._process();a=this._hash.words;for(c=0;4>c;c++)b=a[c],a[c]=(b<<8|b>>>24)&16711935|(b<<24|b>>>8)&4278255360}});e.MD5=d._createHelper(a);e.HmacMD5=d._createHmacHelper(a)})(Math);
(function(){var n=CryptoJS,l=n.lib,i=l.Base,j=l.WordArray,l=n.algo,k=l.EvpKDF=i.extend({cfg:i.extend({keySize:4,hasher:l.MD5,iterations:1}),init:function(e){this.cfg=this.cfg.extend(e)},compute:function(e,d){for(var c=this.cfg,a=c.hasher.create(),f=j.create(),i=f.words,k=c.keySize,c=c.iterations;i.length<k;){b&&a.update(b);var b=a.update(e).finalize(d);a.reset();for(var l=1;l<c;l++)b=a.finalize(b),a.reset();f.concat(b)}f.sigBytes=4*k;return f}});n.EvpKDF=function(e,d,c){return k.create(c).compute(e,
d)}})();
CryptoJS.lib.Cipher||function(n){var l=CryptoJS,i=l.lib,j=i.Base,k=i.WordArray,e=i.BufferedBlockAlgorithm,d=l.enc.Base64,c=l.algo.EvpKDF,a=i.Cipher=e.extend({cfg:j.extend(),createEncryptor:function(a,b){return this.create(this._ENC_XFORM_MODE,a,b)},createDecryptor:function(a,b){return this.create(this._DEC_XFORM_MODE,a,b)},init:function(a,b,c){this.cfg=this.cfg.extend(c);this._xformMode=a;this._key=b;this.reset()},reset:function(){e.reset.call(this);this._doReset()},process:function(a){this._append(a);return this._process()},
finalize:function(a){a&&this._append(a);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(){return function(a){return{encrypt:function(b,c,d){return("string"==typeof c?r:p).encrypt(a,b,c,d)},decrypt:function(b,c,d){return("string"==typeof c?r:p).decrypt(a,b,c,d)}}}}()});i.StreamCipher=a.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var f=l.mode={},o=i.BlockCipherMode=j.extend({createEncryptor:function(a,b){return this.Encryptor.create(a,
b)},createDecryptor:function(a,b){return this.Decryptor.create(a,b)},init:function(a,b){this._cipher=a;this._iv=b}}),f=f.CBC=function(){function a(b,c,g){var d=this._iv;d?this._iv=n:d=this._prevBlock;for(var h=0;h<g;h++)b[c+h]^=d[h]}var b=o.extend();b.Encryptor=b.extend({processBlock:function(b,c){var d=this._cipher,h=d.blockSize;a.call(this,b,c,h);d.encryptBlock(b,c);this._prevBlock=b.slice(c,c+h)}});b.Decryptor=b.extend({processBlock:function(b,c){var d=this._cipher,h=d.blockSize,f=b.slice(c,c+
h);d.decryptBlock(b,c);a.call(this,b,c,h);this._prevBlock=f}});return b}(),q=(l.pad={}).Pkcs7={pad:function(a,b){for(var c=4*b,c=c-a.sigBytes%c,d=c<<24|c<<16|c<<8|c,f=[],e=0;e<c;e+=4)f.push(d);c=k.create(f,c);a.concat(c)},unpad:function(a){a.sigBytes-=a.words[a.sigBytes-1>>>2]&255}};i.BlockCipher=a.extend({cfg:a.cfg.extend({mode:f,padding:q}),reset:function(){a.reset.call(this);var b=this.cfg,c=b.iv,b=b.mode;if(this._xformMode==this._ENC_XFORM_MODE)var d=b.createEncryptor;else d=b.createDecryptor,
this._minBufferSize=1;this._mode=d.call(b,this,c&&c.words)},_doProcessBlock:function(a,b){this._mode.processBlock(a,b)},_doFinalize:function(){var a=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){a.pad(this._data,this.blockSize);var b=this._process(!0)}else b=this._process(!0),a.unpad(b);return b},blockSize:4});var b=i.CipherParams=j.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),f=(l.format={}).OpenSSL={stringify:function(a){var b=
a.ciphertext,a=a.salt,b=(a?k.create([1398893684,1701076831]).concat(a).concat(b):b).toString(d);return b=b.replace(/(.{64})/g,"$1\n")},parse:function(a){var a=d.parse(a),c=a.words;if(1398893684==c[0]&&1701076831==c[1]){var f=k.create(c.slice(2,4));c.splice(0,4);a.sigBytes-=16}return b.create({ciphertext:a,salt:f})}},p=i.SerializableCipher=j.extend({cfg:j.extend({format:f}),encrypt:function(a,c,d,f){var f=this.cfg.extend(f),e=a.createEncryptor(d,f),c=e.finalize(c),e=e.cfg;return b.create({ciphertext:c,
key:d,iv:e.iv,algorithm:a,mode:e.mode,padding:e.padding,blockSize:a.blockSize,formatter:f.format})},decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);return a.createDecryptor(c,d).finalize(b.ciphertext)},_parse:function(a,b){return"string"==typeof a?b.parse(a):a}}),l=(l.kdf={}).OpenSSL={compute:function(a,d,f,e){e||(e=k.random(8));a=c.create({keySize:d+f}).compute(a,e);f=k.create(a.words.slice(d),4*f);a.sigBytes=4*d;return b.create({key:a,iv:f,salt:e})}},r=i.PasswordBasedCipher=
p.extend({cfg:p.cfg.extend({kdf:l}),encrypt:function(a,b,c,d){d=this.cfg.extend(d);c=d.kdf.compute(c,a.keySize,a.ivSize);d.iv=c.iv;a=p.encrypt.call(this,a,b,c.key,d);a.mixIn(c);return a},decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);c=d.kdf.compute(c,a.keySize,a.ivSize,b.salt);d.iv=c.iv;return p.decrypt.call(this,a,b,c.key,d)}})}();
(function(){function n(){var d=this._X,c=this._C;c[0]=c[0]+1295307597+this._b|0;c[1]=c[1]+3545052371+(1295307597>c[0]>>>0?1:0)|0;c[2]=c[2]+886263092+(3545052371>c[1]>>>0?1:0)|0;c[3]=c[3]+1295307597+(886263092>c[2]>>>0?1:0)|0;c[4]=c[4]+3545052371+(1295307597>c[3]>>>0?1:0)|0;c[5]=c[5]+886263092+(3545052371>c[4]>>>0?1:0)|0;c[6]=c[6]+1295307597+(886263092>c[5]>>>0?1:0)|0;c[7]=c[7]+3545052371+(1295307597>c[6]>>>0?1:0)|0;this._b=3545052371>c[7]>>>0?1:0;for(var a=0;8>a;a++){var f=d[a]+c[a],e=f&65535,i=f>>>
16;k[a]=((e*e>>>17)+e*i>>>15)+i*i^((f&4294901760)*f|0)+((f&65535)*f|0)}var c=k[0],a=k[1],f=k[2],e=k[3],i=k[4],b=k[5],j=k[6],l=k[7];d[0]=c+(l<<16|l>>>16)+(j<<16|j>>>16)|0;d[1]=a+(c<<8|c>>>24)+l|0;d[2]=f+(a<<16|a>>>16)+(c<<16|c>>>16)|0;d[3]=e+(f<<8|f>>>24)+a|0;d[4]=i+(e<<16|e>>>16)+(f<<16|f>>>16)|0;d[5]=b+(i<<8|i>>>24)+e|0;d[6]=j+(b<<16|b>>>16)+(i<<16|i>>>16)|0;d[7]=l+(j<<8|j>>>24)+b|0}var l=CryptoJS,i=l.lib.StreamCipher,j=[],k=[],e=l.algo.Rabbit=i.extend({_doReset:function(){for(var d=this._key.words,
c=d[0],a=d[1],f=d[2],e=d[3],d=this._X=[c,e<<16|f>>>16,a,c<<16|e>>>16,f,a<<16|c>>>16,e,f<<16|a>>>16],c=this._C=[f<<16|f>>>16,c&4294901760|a&65535,e<<16|e>>>16,a&4294901760|f&65535,c<<16|c>>>16,f&4294901760|e&65535,a<<16|a>>>16,e&4294901760|c&65535],a=this._b=0;4>a;a++)n.call(this);for(a=0;8>a;a++)c[a]^=d[a+4&7];if(d=this.cfg.iv){a=d.words;d=a[0];a=a[1];d=(d<<8|d>>>24)&16711935|(d<<24|d>>>8)&4278255360;a=(a<<8|a>>>24)&16711935|(a<<24|a>>>8)&4278255360;f=d>>>16|a&4294901760;e=a<<16|d&65535;c[0]^=d;c[1]^=
f;c[2]^=a;c[3]^=e;c[4]^=d;c[5]^=f;c[6]^=a;c[7]^=e;for(a=0;4>a;a++)n.call(this)}},_doProcessBlock:function(d,c){var a=this._X;n.call(this);j[0]=a[0]^a[5]>>>16^a[3]<<16;j[1]=a[2]^a[7]>>>16^a[5]<<16;j[2]=a[4]^a[1]>>>16^a[7]<<16;j[3]=a[6]^a[3]>>>16^a[1]<<16;for(a=0;4>a;a++){var e=j[a],e=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360;d[c+a]^=e}},blockSize:4,ivSize:2});l.Rabbit=i._createHelper(e)})();

define("crypto-js/rollups/rabbit", function(){});

define('src/adapters/crypto',['require','crypto-js/rollups/aes','crypto-js/rollups/tripledes','crypto-js/rollups/rabbit'],function(require) {

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

define('src/adapters/adapters',['require','src/adapters/crypto'],function(require) {

  var CryptoAdapters = require('src/adapters/crypto');

  return {

    // Encryption Adatpers
    AES: CryptoAdapters.AES,
    TripleDES: CryptoAdapters.TripleDES,
    Rabbit: CryptoAdapters.Rabbit,
    // Convenience encryption wrapper (default to AES)
    Encryption: CryptoAdapters.AES

  };
});

define('src/fs',['require','nodash','encoding','src/path','src/path','src/path','src/shared','src/shared','src/shared','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/error','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/constants','src/providers/providers','src/adapters/adapters','src/path'],function(require) {

  var _ = require('nodash');

  // TextEncoder and TextDecoder will either already be present, or use this shim.
  // Because of the way the spec is defined, we need to get them off the global.
  require('encoding');

  var normalize = require('src/path').normalize;
  var dirname = require('src/path').dirname;
  var basename = require('src/path').basename;

  var guid = require('src/shared').guid;
  var hash = require('src/shared').hash;
  var nop = require('src/shared').nop;

  var EExists = require('src/error').EExists;
  var EIsDirectory = require('src/error').EIsDirectory;
  var ENoEntry = require('src/error').ENoEntry;
  var EBusy = require('src/error').EBusy;
  var ENotEmpty = require('src/error').ENotEmpty;
  var ENotDirectory = require('src/error').ENotDirectory;
  var EBadFileDescriptor = require('src/error').EBadFileDescriptor;
  var ENotImplemented = require('src/error').ENotImplemented;
  var ENotMounted = require('src/error').ENotMounted;
  var EInvalid = require('src/error').EInvalid;
  var EIO = require('src/error').EIO;
  var ELoop = require('src/error').ELoop;
  var EFileSystemError = require('src/error').EFileSystemError;

  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FS_FORMAT = require('src/constants').FS_FORMAT;
  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var MODE_SYMBOLIC_LINK = require('src/constants').MODE_SYMBOLIC_LINK;
  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var ROOT_NODE_ID = require('src/constants').ROOT_NODE_ID;
  var SYMLOOP_MAX = require('src/constants').SYMLOOP_MAX;
  var FS_READY = require('src/constants').FS_READY;
  var FS_PENDING = require('src/constants').FS_PENDING;
  var FS_ERROR = require('src/constants').FS_ERROR;
  var O_READ = require('src/constants').O_READ;
  var O_WRITE = require('src/constants').O_WRITE;
  var O_CREATE = require('src/constants').O_CREATE;
  var O_EXCLUSIVE = require('src/constants').O_EXCLUSIVE;
  var O_TRUNCATE = require('src/constants').O_TRUNCATE;
  var O_APPEND = require('src/constants').O_APPEND;
  var O_FLAGS = require('src/constants').O_FLAGS;

  var providers = require('src/providers/providers');
  var adapters = require('src/adapters/adapters');

  /*
   * DirectoryEntry
   */

  function DirectoryEntry(id, type) {
    this.id = id;
    this.type = type || MODE_FILE;
  }

  /*
   * OpenFileDescription
   */

  function OpenFileDescription(id, flags, position) {
    this.id = id;
    this.flags = flags;
    this.position = position;
  }

  /*
   * Node
   */

  function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, nlinks, version) {
    var now = Date.now();

    this.id = id || hash(guid());
    this.mode = mode || MODE_FILE;  // node type (file, directory, etc)
    this.size = size || 0; // size (bytes for files, entries for directories)
    this.atime = atime || now; // access time
    this.ctime = ctime || now; // creation time
    this.mtime = mtime || now; // modified time
    this.flags = flags || []; // file flags
    this.xattrs = xattrs || {}; // extended attributes
    this.nlinks = nlinks || 0; // links count
    this.version = version || 0; // node version
    this.blksize = undefined; // block size
    this.nblocks = 1; // blocks count
    this.data = hash(guid()); // id for data object
  }

  /*
   * Stats
   */

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

  /*
   * find_node
   */

  // in: file or directory path
  // out: node structure, or error
  function find_node(context, path, callback) {
    path = normalize(path);
    if(!path) {
      return callback(new ENoEntry('path is an empty string'));
    }
    var name = basename(path);
    var parentPath = dirname(path);
    var followedCount = 0;

    function check_root_directory_node(error, rootDirectoryNode) {
      if(error) {
        callback(error);
      } else if(!rootDirectoryNode) {
        callback(new ENoEntry('path does not exist'));
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
        callback(new ENotDirectory('a component of the path prefix is not a directory'));
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
          callback(new ENoEntry('path does not exist'));
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
            callback(new ELoop('too many symbolic links were encountered'));
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
        context.get(ROOT_NODE_ID, check_root_directory_node);
      } else {
        find_node(context, parentPath, read_parent_directory_data);
      }
    }

    if(ROOT_DIRECTORY_NAME == name) {
      context.get(ROOT_NODE_ID, check_root_directory_node);
    } else {
      find_node(context, parentPath, read_parent_directory_data);
    }
  }

  /*
   * make_root_directory
   */

  // Note: this should only be invoked when formatting a new file system
  function make_root_directory(context, callback) {
    var directoryNode;
    var directoryData;

    function write_directory_node(error, existingNode) {
      if(!error && existingNode) {
        callback(new EExists());
      } else if(error && !error instanceof ENoEntry) {
        callback(error);
      } else {
        directoryNode = new Node(ROOT_NODE_ID, MODE_DIRECTORY);
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

    find_node(context, ROOT_DIRECTORY_NAME, write_directory_node);
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
        callback(new EExists());
      } else if(error && !error instanceof ENoEntry) {
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

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
        context.put(parentDirectoryNode.data, parentDirectoryData, callback);
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
        callback(new EBusy());
      } else if(!_(result).has(name)) {
        callback(new ENoEntry());
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
        callback(new ENotDirectory());
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
          callback(new ENotEmpty());
        } else {
          remove_directory_entry_from_parent_directory_node();
        }
      }
    }

    function remove_directory_entry_from_parent_directory_node() {
      delete parentDirectoryData[name];
      context.put(parentDirectoryNode.data, parentDirectoryData, remove_directory_node);
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
        callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
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
            callback(new ENoEntry('O_CREATE and O_EXCLUSIVE are set, and the named file exists'));
          } else {
            directoryEntry = directoryData[name];
            if(directoryEntry.type == MODE_DIRECTORY && _(flags).contains(O_WRITE)) {
              callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
            } else {
              context.get(directoryEntry.id, check_if_symbolic_link);
            }
          }
        } else {
          if(!_(flags).contains(O_CREATE)) {
            callback(new ENoEntry('O_CREATE is not set and the named file does not exist'));
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
            callback(new ELoop('too many symbolic links were encountered'));
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
          callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
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

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_FILE);
        context.put(directoryNode.data, directoryData, handle_update_result);
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

    function update_file_node(error) {
      if(error) {
        callback(error);
      } else {
        context.put(fileNode.id, fileNode, return_nbytes);
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
        newData.set(buffer, _position);
        if(undefined === position) {
          ofd.position += length;
        }

        fileNode.size = newSize;
        fileNode.mtime = Date.now();
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

    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }

    find_node(context, path, check_file);
  }

  function fstat_file(context, ofd, callback) {
    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }

    context.get(ofd.id, check_file);
  }

  function lstat_file(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;

    if(ROOT_DIRECTORY_NAME == name) {
      context.get(ROOT_NODE_ID, check_file);
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
          callback(new ENoEntry('a component of the path does not name an existing file'));
        } else {
          context.get(directoryData[name].id, check_file);
        }
      }
    }

    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
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

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks += 1;
        context.put(fileNode.id, fileNode, callback);
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
          callback(new EExists('newpath resolves to an existing file'));
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
          callback(new ENoEntry('a component of either path prefix does not exist'));
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
        context.put(directoryNode.data, directoryData, callback);
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
          context.put(fileNode.id, fileNode, update_directory_data);
        }
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(!_(directoryData).has(name)) {
          callback(new ENoEntry('a component of the path does not name an existing file'));
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
      callback(new EExists('the destination path already exists'));
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
          callback(new EExists('the destination path already exists'));
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

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_SYMBOLIC_LINK);
        context.put(directoryNode.data, directoryData, callback);
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
          callback(new ENoEntry('a component of the path does not name an existing file'));
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
          callback(new EInvalid("path not a symbolic link"));
        } else {
          callback(null, result.data);
        }
      }
    }
  }

  function validate_flags(flags) {
    if(!_(O_FLAGS).has(flags)) {
      return null;
    }
    return O_FLAGS[flags];
  }

  // nullCheck from https://github.com/joyent/node/blob/master/lib/fs.js
  function nullCheck(path, callback) {
    if (('' + path).indexOf('\u0000') !== -1) {
      var er = new Error('Path must be a string without null bytes.');
      callback(er);
      return false;
    }
    return true;
  }

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


  /*
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

    var name = options.name || FILE_SYSTEM_NAME;
    var flags = options.flags;
    var provider = options.provider || new providers.Default(name);
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
        error = new EFileSystemError('unknown error');
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

    // Open file system storage provider
    provider.open(function(err, needsFormatting) {
      function complete(error) {
        fs.provider = provider;
        if(error) {
          fs.readyState = FS_ERROR;
        } else {
          fs.readyState = FS_READY;
          runQueued();
        }
        callback(error);
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
        make_root_directory(context, complete);
      });
    });
  }

  // Expose storage providers on FileSystem constructor
  FileSystem.providers = providers;

  // Expose adatpers on FileSystem constructor
  FileSystem.adapters = adapters;

  function _open(fs, context, path, flags, callback) {
    if(!nullCheck(path, callback)) return;

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
        var openFileDescription = new OpenFileDescription(fileNode.id, flags, position);
        var fd = fs.allocDescriptor(openFileDescription);
        callback(null, fd);
      }
    }

    flags = validate_flags(flags);
    if(!flags) {
      callback(new EInvalid('flags is not valid'));
    }

    open_file(context, path, flags, check_result);
  }

  function _close(fs, fd, callback) {
    if(!_(fs.openFiles).has(fd)) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      fs.releaseDescriptor(fd);
      callback(null);
    }
  }

  function _mkdir(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    make_directory(context, path, check_result);
  }

  function _rmdir(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    remove_directory(context, path, check_result);
  }

  function _stat(context, name, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, name);
        callback(null, stats);
      }
    }

    stat_file(context, path, check_result);
  }

  function _fstat(fs, context, fd, callback) {
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
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      fstat_file(context, ofd, check_result);
    }
  }

  function _link(context, oldpath, newpath, callback) {
    if(!nullCheck(oldpath, callback)) return;
    if(!nullCheck(newpath, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    link_node(context, oldpath, newpath, check_result);
  }

  function _unlink(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    unlink_node(context, path, check_result);
  }

  function _read(fs, context, fd, buffer, offset, length, position, callback) {
    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        callback(error);
      } else {
        callback(null, nbytes);
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_READ)) {
      callback(new EBadFileDescriptor('descriptor does not permit reading'));
    } else {
      read_data(context, ofd, buffer, offset, length, position, check_result);
    }
  }

  function _readFile(fs, context, path, options, callback) {
    if(!options) {
      options = { encoding: null, flag: 'r' };
    } else if(typeof options === "function") {
      options = { encoding: null, flag: 'r' };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: 'r' };
    }

    if(!nullCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'r');
    if(!flags) {
      callback(new EInvalid('flags is not valid'));
    }

    open_file(context, path, flags, function(err, fileNode) {
      if(err) {
        return callback(err);
      }
      var ofd = new OpenFileDescription(fileNode.id, flags, 0);
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

  function _write(fs, context, fd, buffer, offset, length, position, callback) {
    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        callback(error);
      } else {
        callback(null, nbytes);
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new EBadFileDescriptor('descriptor does not permit writing'));
    } else if(buffer.length - offset < length) {
      callback(new EIO('intput buffer is too small'));
    } else {
      write_data(context, ofd, buffer, offset, length, position, check_result);
    }
  }

  function _writeFile(fs, context, path, data, options, callback) {
    if(!options) {
      options = { encoding: 'utf8', flag: 'w' };
    } else if(typeof options === "function") {
      options = { encoding: 'utf8', flag: 'w' };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: 'w' };
    }

    if(!nullCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'w');
    if(!flags) {
      callback(new EInvalid('flags is not valid'));
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
      var ofd = new OpenFileDescription(fileNode.id, flags, 0);
      var fd = fs.allocDescriptor(ofd);

      write_data(context, ofd, data, 0, data.length, 0, function(err2, nbytes) {
        if(err2) {
          return callback(err2);
        }
        fs.releaseDescriptor(fd);
        callback(null);
      });
    });
  }

  function _getxattr(path, name, callback) {
    // TODO
    //     if(!nullCheck(path, callback)) return;
  }

  function _setxattr(path, name, value, callback) {
    // TODO
    //    if(!nullCheck(path, callback)) return;
  }

  function _lseek(fs, context, fd, offset, whence, callback) {
    function check_result(error, offset) {
      if(error) {
        callback(error);
      } else {
        callback(offset);
      }
    }

    function update_descriptor_position(error, stats) {
      if(error) {
        callback(error);
      } else {
        if(stats.size + offset < 0) {
          callback(new EInvalid('resulting file offset would be negative'));
        } else {
          ofd.position = stats.size + offset;
          callback(null, ofd.position);
        }
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    }

    if('SET' === whence) {
      if(offset < 0) {
        callback(new EInvalid('resulting file offset would be negative'));
      } else {
        ofd.position = offset;
        callback(null, ofd.position);
      }
    } else if('CUR' === whence) {
      if(ofd.position + offset < 0) {
        callback(new EInvalid('resulting file offset would be negative'));
      } else {
        ofd.position += offset;
        callback(null, ofd.position);
      }
    } else if('END' === whence) {
      fstat_file(context, ofd, update_descriptor_position);
    } else {
      callback(new EInvalid('whence argument is not a proper value'));
    }
  }

  function _readdir(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, files) {
      if(error) {
        callback(error);
      } else {
        callback(null, files);
      }
    }

    read_directory(context, path, check_result);
  }

  function _utimes(path, atime, mtime, callback) {
    // TODO
    //     if(!nullCheck(path, callback)) return;
  }

  function _rename(context, oldpath, newpath, callback) {
    if(!nullCheck(oldpath, callback)) return;
    if(!nullCheck(newpath, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    function unlink_old_node(error) {
      if(error) {
        callback(error);
      } else {
        unlink_node(context, oldpath, check_result);
      }
    }

    link_node(context, oldpath, newpath, unlink_old_node);
  }

  function _symlink(context, srcpath, dstpath, callback) {
    if(!nullCheck(srcpath, callback)) return;
    if(!nullCheck(dstpath, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    make_symbolic_link(context, srcpath, dstpath, check_result);
  }

  function _readlink(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }

    read_link(context, path, check_result);
  }

  function _realpath(fd, length, callback) {
    // TODO
  }

  function _lstat(fs, context, path, callback) {
    if(!nullCheck(path, callback)) return;

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

  function _truncate(path, length, callback) {
    // TODO
    //     if(!nullCheck(path, callback)) return;
  }

  function _ftruncate(fd, length, callback) {
    // TODO
    //     if(!nullCheck(path, callback)) return;
  }


  /**
   * Public API for FileSystem
   */

  FileSystem.prototype.open = function(path, flags, mode, callback) {
    // We support the same signature as node with a `mode` arg, but
    // ignore it. Find the callback.
    callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _open(fs, context, path, flags, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.close = function(fd, callback) {
    _close(this, fd, maybeCallback(callback));
  };
  FileSystem.prototype.mkdir = function(path, mode, callback) {
    // Support passing a mode arg, but we ignore it internally for now.
    if(typeof mode === 'function') {
      callback = mode;
    }
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _mkdir(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.rmdir = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _rmdir(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.stat = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _stat(context, fs.name, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.fstat = function(fd, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _fstat(fs, context, fd, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.link = function(oldpath, newpath, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _link(context, oldpath, newpath, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.unlink = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _unlink(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.read = function(fd, buffer, offset, length, position, callback) {
    // Follow how node.js does this
    callback = maybeCallback(callback);
    function wrapper(err, bytesRead) {
      // Retain a reference to buffer so that it can't be GC'ed too soon.
      callback(err, bytesRead || 0, buffer);
    }
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _read(fs, context, fd, buffer, offset, length, position, wrapper);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readFile = function(path, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _readFile(fs, context, path, options, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.write = function(fd, buffer, offset, length, position, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _write(fs, context, fd, buffer, offset, length, position, callback);
      }
    );

    if(error) callback(error);
  };
  FileSystem.prototype.writeFile = function(path, data, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _writeFile(fs, context, path, data, options, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.lseek = function(fd, offset, whence, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _lseek(fs, context, fd, offset, whence, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readdir = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _readdir(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.rename = function(oldpath, newpath, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _rename(context, oldpath, newpath, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readlink = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _readlink(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.symlink = function(srcpath, dstpath, type, callback_) {
    // Follow node.js in allowing the `type` arg to be passed, but we ignore it.
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _symlink(context, srcpath, dstpath, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.lstat = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _lstat(fs, context, path, callback);
      }
    );
    if(error) callback(error);
  };

  return {
    FileSystem: FileSystem,
    Path: require('src/path')
  };

});

  var IDBFS = require( "src/fs" );

  return IDBFS;

}));

