/* Test file for filerjs v0.0.44*/
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*global setImmediate: false, setTimeout: false, console: false */

/**
 * async.js shim, based on https://raw.github.com/caolan/async/master/lib/async.js Feb 18, 2014
 * Used under MIT - https://github.com/caolan/async/blob/master/LICENSE
 */

(function () {

    var async = {};

    // async.js functions used in Filer

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
                        callback();
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

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
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

},{}],2:[function(require,module,exports){
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

module.exports = EventEmitter;

},{}],3:[function(require,module,exports){
(function (global){
// Based on https://github.com/diy/intercom.js/blob/master/lib/intercom.js
// Copyright 2012 DIY Co Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

var EventEmitter = require('./eventemitter.js');
var guid = require('../src/shared.js').guid;

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
}(global));

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
  if (typeof document === 'undefined') {
    return;
  }

  if (document.attachEvent) {
    document.attachEvent('onstorage', storageHandler);
  } else {
    global.addEventListener('storage', storageHandler, false);
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
  event = event || global.event;
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

module.exports = Intercom;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../src/shared.js":67,"./eventemitter.js":2}],4:[function(require,module,exports){
// Cherry-picked bits of underscore.js, lodash.js

/**
 * Lo-Dash 2.4.0 <http://lodash.com/>
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
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

module.exports = nodash;

},{}],5:[function(require,module,exports){
/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function(chars){
  "use strict";

  exports.encode = function(arraybuffer) {
    var bytes = new Uint8Array(arraybuffer),
    i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3) {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }

    return base64;
  };

  exports.decode =  function(base64) {
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
      encoded1 = chars.indexOf(base64[i]);
      encoded2 = chars.indexOf(base64[i+1]);
      encoded3 = chars.indexOf(base64[i+2]);
      encoded4 = chars.indexOf(base64[i+3]);

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  };
})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

},{}],6:[function(require,module,exports){
module.exports = require('./lib/chai');

},{"./lib/chai":7}],7:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var used = []
  , exports = module.exports = {};

/*!
 * Chai version
 */

exports.version = '1.9.2';

/*!
 * Assertion Error
 */

exports.AssertionError = require('assertion-error');

/*!
 * Utils for plugins (not exported)
 */

var util = require('./chai/utils');

/**
 * # .use(function)
 *
 * Provides a way to extend the internals of Chai
 *
 * @param {Function}
 * @returns {this} for chaining
 * @api public
 */

exports.use = function (fn) {
  if (!~used.indexOf(fn)) {
    fn(this, util);
    used.push(fn);
  }

  return this;
};

/*!
 * Configuration
 */

var config = require('./chai/config');
exports.config = config;

/*!
 * Primary `Assertion` prototype
 */

var assertion = require('./chai/assertion');
exports.use(assertion);

/*!
 * Core Assertions
 */

var core = require('./chai/core/assertions');
exports.use(core);

/*!
 * Expect interface
 */

var expect = require('./chai/interface/expect');
exports.use(expect);

/*!
 * Should interface
 */

var should = require('./chai/interface/should');
exports.use(should);

/*!
 * Assert interface
 */

var assert = require('./chai/interface/assert');
exports.use(assert);

},{"./chai/assertion":8,"./chai/config":9,"./chai/core/assertions":10,"./chai/interface/assert":11,"./chai/interface/expect":12,"./chai/interface/should":13,"./chai/utils":24,"assertion-error":33}],8:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('./config');

module.exports = function (_chai, util) {
  /*!
   * Module dependencies.
   */

  var AssertionError = _chai.AssertionError
    , flag = util.flag;

  /*!
   * Module export.
   */

  _chai.Assertion = Assertion;

  /*!
   * Assertion Constructor
   *
   * Creates object for chaining.
   *
   * @api private
   */

  function Assertion (obj, msg, stack) {
    flag(this, 'ssfi', stack || arguments.callee);
    flag(this, 'object', obj);
    flag(this, 'message', msg);
  }

  Object.defineProperty(Assertion, 'includeStack', {
    get: function() {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      return config.includeStack;
    },
    set: function(value) {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      config.includeStack = value;
    }
  });

  Object.defineProperty(Assertion, 'showDiff', {
    get: function() {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      return config.showDiff;
    },
    set: function(value) {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      config.showDiff = value;
    }
  });

  Assertion.addProperty = function (name, fn) {
    util.addProperty(this.prototype, name, fn);
  };

  Assertion.addMethod = function (name, fn) {
    util.addMethod(this.prototype, name, fn);
  };

  Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
    util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  Assertion.overwriteProperty = function (name, fn) {
    util.overwriteProperty(this.prototype, name, fn);
  };

  Assertion.overwriteMethod = function (name, fn) {
    util.overwriteMethod(this.prototype, name, fn);
  };

  Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
    util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  /*!
   * ### .assert(expression, message, negateMessage, expected, actual)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {Philosophical} expression to be tested
   * @param {String or Function} message or function that returns message to display if fails
   * @param {String or Function} negatedMessage or function that returns negatedMessage to display if negated expression fails
   * @param {Mixed} expected value (remember to check for negation)
   * @param {Mixed} actual (optional) will default to `this.obj`
   * @api private
   */

  Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
    var ok = util.test(this, arguments);
    if (true !== showDiff) showDiff = false;
    if (true !== config.showDiff) showDiff = false;

    if (!ok) {
      var msg = util.getMessage(this, arguments)
        , actual = util.getActual(this, arguments);
      throw new AssertionError(msg, {
          actual: actual
        , expected: expected
        , showDiff: showDiff
      }, (config.includeStack) ? this.assert : flag(this, 'ssfi'));
    }
  };

  /*!
   * ### ._obj
   *
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @api private
   */

  Object.defineProperty(Assertion.prototype, '_obj',
    { get: function () {
        return flag(this, 'object');
      }
    , set: function (val) {
        flag(this, 'object', val);
      }
  });
};

},{"./config":9}],9:[function(require,module,exports){
module.exports = {

  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {Boolean}
   * @api public
   */

   includeStack: false,

  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {Boolean}
   * @api public
   */

  showDiff: true,

  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded,
   * the value is truncated.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {Number}
   * @api public
   */

  truncateThreshold: 40

};

},{}],10:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, _) {
  var Assertion = chai.Assertion
    , toString = Object.prototype.toString
    , flag = _.flag;

  /**
   * ### Language Chains
   *
   * The following are provided as chainable getters to
   * improve the readability of your assertions. They
   * do not provide testing capabilities unless they
   * have been overwritten by a plugin.
   *
   * **Chains**
   *
   * - to
   * - be
   * - been
   * - is
   * - that
   * - and
   * - has
   * - have
   * - with
   * - at
   * - of
   * - same
   *
   * @name language chains
   * @api public
   */

  [ 'to', 'be', 'been'
  , 'is', 'and', 'has', 'have'
  , 'with', 'that', 'at'
  , 'of', 'same' ].forEach(function (chain) {
    Assertion.addProperty(chain, function () {
      return this;
    });
  });

  /**
   * ### .not
   *
   * Negates any of assertions following in the chain.
   *
   *     expect(foo).to.not.equal('bar');
   *     expect(goodFn).to.not.throw(Error);
   *     expect({ foo: 'baz' }).to.have.property('foo')
   *       .and.not.equal('bar');
   *
   * @name not
   * @api public
   */

  Assertion.addProperty('not', function () {
    flag(this, 'negate', true);
  });

  /**
   * ### .deep
   *
   * Sets the `deep` flag, later used by the `equal` and
   * `property` assertions.
   *
   *     expect(foo).to.deep.equal({ bar: 'baz' });
   *     expect({ foo: { bar: { baz: 'quux' } } })
   *       .to.have.deep.property('foo.bar.baz', 'quux');
   *
   * @name deep
   * @api public
   */

  Assertion.addProperty('deep', function () {
    flag(this, 'deep', true);
  });

  /**
   * ### .a(type)
   *
   * The `a` and `an` assertions are aliases that can be
   * used either as language chains or to assert a value's
   * type.
   *
   *     // typeof
   *     expect('test').to.be.a('string');
   *     expect({ foo: 'bar' }).to.be.an('object');
   *     expect(null).to.be.a('null');
   *     expect(undefined).to.be.an('undefined');
   *
   *     // language chain
   *     expect(foo).to.be.an.instanceof(Foo);
   *
   * @name a
   * @alias an
   * @param {String} type
   * @param {String} message _optional_
   * @api public
   */

  function an (type, msg) {
    if (msg) flag(this, 'message', msg);
    type = type.toLowerCase();
    var obj = flag(this, 'object')
      , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

    this.assert(
        type === _.type(obj)
      , 'expected #{this} to be ' + article + type
      , 'expected #{this} not to be ' + article + type
    );
  }

  Assertion.addChainableMethod('an', an);
  Assertion.addChainableMethod('a', an);

  /**
   * ### .include(value)
   *
   * The `include` and `contain` assertions can be used as either property
   * based language chains or as methods to assert the inclusion of an object
   * in an array or a substring in a string. When used as language chains,
   * they toggle the `contain` flag for the `keys` assertion.
   *
   *     expect([1,2,3]).to.include(2);
   *     expect('foobar').to.contain('foo');
   *     expect({ foo: 'bar', hello: 'universe' }).to.include.keys('foo');
   *
   * @name include
   * @alias contain
   * @param {Object|String|Number} obj
   * @param {String} message _optional_
   * @api public
   */

  function includeChainingBehavior () {
    flag(this, 'contains', true);
  }

  function include (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var expected = false;
    if (_.type(obj) === 'array' && _.type(val) === 'object') {
      for (var i in obj) {
        if (_.eql(obj[i], val)) {
          expected = true;
          break;
        }
      }
    } else if (_.type(val) === 'object') {
      if (!flag(this, 'negate')) {
        for (var k in val) new Assertion(obj).property(k, val[k]);
        return;
      }
      var subset = {}
      for (var k in val) subset[k] = obj[k]
      expected = _.eql(subset, val);
    } else {
      expected = obj && ~obj.indexOf(val)
    }
    this.assert(
        expected
      , 'expected #{this} to include ' + _.inspect(val)
      , 'expected #{this} to not include ' + _.inspect(val));
  }

  Assertion.addChainableMethod('include', include, includeChainingBehavior);
  Assertion.addChainableMethod('contain', include, includeChainingBehavior);

  /**
   * ### .ok
   *
   * Asserts that the target is truthy.
   *
   *     expect('everthing').to.be.ok;
   *     expect(1).to.be.ok;
   *     expect(false).to.not.be.ok;
   *     expect(undefined).to.not.be.ok;
   *     expect(null).to.not.be.ok;
   *
   * @name ok
   * @api public
   */

  Assertion.addProperty('ok', function () {
    this.assert(
        flag(this, 'object')
      , 'expected #{this} to be truthy'
      , 'expected #{this} to be falsy');
  });

  /**
   * ### .true
   *
   * Asserts that the target is `true`.
   *
   *     expect(true).to.be.true;
   *     expect(1).to.not.be.true;
   *
   * @name true
   * @api public
   */

  Assertion.addProperty('true', function () {
    this.assert(
        true === flag(this, 'object')
      , 'expected #{this} to be true'
      , 'expected #{this} to be false'
      , this.negate ? false : true
    );
  });

  /**
   * ### .false
   *
   * Asserts that the target is `false`.
   *
   *     expect(false).to.be.false;
   *     expect(0).to.not.be.false;
   *
   * @name false
   * @api public
   */

  Assertion.addProperty('false', function () {
    this.assert(
        false === flag(this, 'object')
      , 'expected #{this} to be false'
      , 'expected #{this} to be true'
      , this.negate ? true : false
    );
  });

  /**
   * ### .null
   *
   * Asserts that the target is `null`.
   *
   *     expect(null).to.be.null;
   *     expect(undefined).not.to.be.null;
   *
   * @name null
   * @api public
   */

  Assertion.addProperty('null', function () {
    this.assert(
        null === flag(this, 'object')
      , 'expected #{this} to be null'
      , 'expected #{this} not to be null'
    );
  });

  /**
   * ### .undefined
   *
   * Asserts that the target is `undefined`.
   *
   *     expect(undefined).to.be.undefined;
   *     expect(null).to.not.be.undefined;
   *
   * @name undefined
   * @api public
   */

  Assertion.addProperty('undefined', function () {
    this.assert(
        undefined === flag(this, 'object')
      , 'expected #{this} to be undefined'
      , 'expected #{this} not to be undefined'
    );
  });

  /**
   * ### .exist
   *
   * Asserts that the target is neither `null` nor `undefined`.
   *
   *     var foo = 'hi'
   *       , bar = null
   *       , baz;
   *
   *     expect(foo).to.exist;
   *     expect(bar).to.not.exist;
   *     expect(baz).to.not.exist;
   *
   * @name exist
   * @api public
   */

  Assertion.addProperty('exist', function () {
    this.assert(
        null != flag(this, 'object')
      , 'expected #{this} to exist'
      , 'expected #{this} to not exist'
    );
  });


  /**
   * ### .empty
   *
   * Asserts that the target's length is `0`. For arrays, it checks
   * the `length` property. For objects, it gets the count of
   * enumerable keys.
   *
   *     expect([]).to.be.empty;
   *     expect('').to.be.empty;
   *     expect({}).to.be.empty;
   *
   * @name empty
   * @api public
   */

  Assertion.addProperty('empty', function () {
    var obj = flag(this, 'object')
      , expected = obj;

    if (Array.isArray(obj) || 'string' === typeof object) {
      expected = obj.length;
    } else if (typeof obj === 'object') {
      expected = Object.keys(obj).length;
    }

    this.assert(
        !expected
      , 'expected #{this} to be empty'
      , 'expected #{this} not to be empty'
    );
  });

  /**
   * ### .arguments
   *
   * Asserts that the target is an arguments object.
   *
   *     function test () {
   *       expect(arguments).to.be.arguments;
   *     }
   *
   * @name arguments
   * @alias Arguments
   * @api public
   */

  function checkArguments () {
    var obj = flag(this, 'object')
      , type = Object.prototype.toString.call(obj);
    this.assert(
        '[object Arguments]' === type
      , 'expected #{this} to be arguments but got ' + type
      , 'expected #{this} to not be arguments'
    );
  }

  Assertion.addProperty('arguments', checkArguments);
  Assertion.addProperty('Arguments', checkArguments);

  /**
   * ### .equal(value)
   *
   * Asserts that the target is strictly equal (`===`) to `value`.
   * Alternately, if the `deep` flag is set, asserts that
   * the target is deeply equal to `value`.
   *
   *     expect('hello').to.equal('hello');
   *     expect(42).to.equal(42);
   *     expect(1).to.not.equal(true);
   *     expect({ foo: 'bar' }).to.not.equal({ foo: 'bar' });
   *     expect({ foo: 'bar' }).to.deep.equal({ foo: 'bar' });
   *
   * @name equal
   * @alias equals
   * @alias eq
   * @alias deep.equal
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEqual (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'deep')) {
      return this.eql(val);
    } else {
      this.assert(
          val === obj
        , 'expected #{this} to equal #{exp}'
        , 'expected #{this} to not equal #{exp}'
        , val
        , this._obj
        , true
      );
    }
  }

  Assertion.addMethod('equal', assertEqual);
  Assertion.addMethod('equals', assertEqual);
  Assertion.addMethod('eq', assertEqual);

  /**
   * ### .eql(value)
   *
   * Asserts that the target is deeply equal to `value`.
   *
   *     expect({ foo: 'bar' }).to.eql({ foo: 'bar' });
   *     expect([ 1, 2, 3 ]).to.eql([ 1, 2, 3 ]);
   *
   * @name eql
   * @alias eqls
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEql(obj, msg) {
    if (msg) flag(this, 'message', msg);
    this.assert(
        _.eql(obj, flag(this, 'object'))
      , 'expected #{this} to deeply equal #{exp}'
      , 'expected #{this} to not deeply equal #{exp}'
      , obj
      , this._obj
      , true
    );
  }

  Assertion.addMethod('eql', assertEql);
  Assertion.addMethod('eqls', assertEql);

  /**
   * ### .above(value)
   *
   * Asserts that the target is greater than `value`.
   *
   *     expect(10).to.be.above(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *
   * @name above
   * @alias gt
   * @alias greaterThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertAbove (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len > n
        , 'expected #{this} to have a length above #{exp} but got #{act}'
        , 'expected #{this} to not have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj > n
        , 'expected #{this} to be above ' + n
        , 'expected #{this} to be at most ' + n
      );
    }
  }

  Assertion.addMethod('above', assertAbove);
  Assertion.addMethod('gt', assertAbove);
  Assertion.addMethod('greaterThan', assertAbove);

  /**
   * ### .least(value)
   *
   * Asserts that the target is greater than or equal to `value`.
   *
   *     expect(10).to.be.at.least(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.least(2);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.least(3);
   *
   * @name least
   * @alias gte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertLeast (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= n
        , 'expected #{this} to have a length at least #{exp} but got #{act}'
        , 'expected #{this} to have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj >= n
        , 'expected #{this} to be at least ' + n
        , 'expected #{this} to be below ' + n
      );
    }
  }

  Assertion.addMethod('least', assertLeast);
  Assertion.addMethod('gte', assertLeast);

  /**
   * ### .below(value)
   *
   * Asserts that the target is less than `value`.
   *
   *     expect(5).to.be.below(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *
   * @name below
   * @alias lt
   * @alias lessThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertBelow (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len < n
        , 'expected #{this} to have a length below #{exp} but got #{act}'
        , 'expected #{this} to not have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj < n
        , 'expected #{this} to be below ' + n
        , 'expected #{this} to be at least ' + n
      );
    }
  }

  Assertion.addMethod('below', assertBelow);
  Assertion.addMethod('lt', assertBelow);
  Assertion.addMethod('lessThan', assertBelow);

  /**
   * ### .most(value)
   *
   * Asserts that the target is less than or equal to `value`.
   *
   *     expect(5).to.be.at.most(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.most(4);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.most(3);
   *
   * @name most
   * @alias lte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertMost (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len <= n
        , 'expected #{this} to have a length at most #{exp} but got #{act}'
        , 'expected #{this} to have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj <= n
        , 'expected #{this} to be at most ' + n
        , 'expected #{this} to be above ' + n
      );
    }
  }

  Assertion.addMethod('most', assertMost);
  Assertion.addMethod('lte', assertMost);

  /**
   * ### .within(start, finish)
   *
   * Asserts that the target is within a range.
   *
   *     expect(7).to.be.within(5,10);
   *
   * Can also be used in conjunction with `length` to
   * assert a length range. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name within
   * @param {Number} start lowerbound inclusive
   * @param {Number} finish upperbound inclusive
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('within', function (start, finish, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , range = start + '..' + finish;
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= start && len <= finish
        , 'expected #{this} to have a length within ' + range
        , 'expected #{this} to not have a length within ' + range
      );
    } else {
      this.assert(
          obj >= start && obj <= finish
        , 'expected #{this} to be within ' + range
        , 'expected #{this} to not be within ' + range
      );
    }
  });

  /**
   * ### .instanceof(constructor)
   *
   * Asserts that the target is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , Chai = new Tea('chai');
   *
   *     expect(Chai).to.be.an.instanceof(Tea);
   *     expect([ 1, 2, 3 ]).to.be.instanceof(Array);
   *
   * @name instanceof
   * @param {Constructor} constructor
   * @param {String} message _optional_
   * @alias instanceOf
   * @api public
   */

  function assertInstanceOf (constructor, msg) {
    if (msg) flag(this, 'message', msg);
    var name = _.getName(constructor);
    this.assert(
        flag(this, 'object') instanceof constructor
      , 'expected #{this} to be an instance of ' + name
      , 'expected #{this} to not be an instance of ' + name
    );
  };

  Assertion.addMethod('instanceof', assertInstanceOf);
  Assertion.addMethod('instanceOf', assertInstanceOf);

  /**
   * ### .property(name, [value])
   *
   * Asserts that the target has a property `name`, optionally asserting that
   * the value of that property is strictly equal to  `value`.
   * If the `deep` flag is set, you can use dot- and bracket-notation for deep
   * references into objects and arrays.
   *
   *     // simple referencing
   *     var obj = { foo: 'bar' };
   *     expect(obj).to.have.property('foo');
   *     expect(obj).to.have.property('foo', 'bar');
   *
   *     // deep referencing
   *     var deepObj = {
   *         green: { tea: 'matcha' }
   *       , teas: [ 'chai', 'matcha', { tea: 'konacha' } ]
   *     };

   *     expect(deepObj).to.have.deep.property('green.tea', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[1]', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[2].tea', 'konacha');
   *
   * You can also use an array as the starting point of a `deep.property`
   * assertion, or traverse nested arrays.
   *
   *     var arr = [
   *         [ 'chai', 'matcha', 'konacha' ]
   *       , [ { tea: 'chai' }
   *         , { tea: 'matcha' }
   *         , { tea: 'konacha' } ]
   *     ];
   *
   *     expect(arr).to.have.deep.property('[0][1]', 'matcha');
   *     expect(arr).to.have.deep.property('[1][2].tea', 'konacha');
   *
   * Furthermore, `property` changes the subject of the assertion
   * to be the value of that property from the original object. This
   * permits for further chainable assertions on that property.
   *
   *     expect(obj).to.have.property('foo')
   *       .that.is.a('string');
   *     expect(deepObj).to.have.property('green')
   *       .that.is.an('object')
   *       .that.deep.equals({ tea: 'matcha' });
   *     expect(deepObj).to.have.property('teas')
   *       .that.is.an('array')
   *       .with.deep.property('[2]')
   *         .that.deep.equals({ tea: 'konacha' });
   *
   * @name property
   * @alias deep.property
   * @param {String} name
   * @param {Mixed} value (optional)
   * @param {String} message _optional_
   * @returns value of property for chaining
   * @api public
   */

  Assertion.addMethod('property', function (name, val, msg) {
    if (msg) flag(this, 'message', msg);

    var descriptor = flag(this, 'deep') ? 'deep property ' : 'property '
      , negate = flag(this, 'negate')
      , obj = flag(this, 'object')
      , value = flag(this, 'deep')
        ? _.getPathValue(name, obj)
        : obj[name];

    if (negate && undefined !== val) {
      if (undefined === value) {
        msg = (msg != null) ? msg + ': ' : '';
        throw new Error(msg + _.inspect(obj) + ' has no ' + descriptor + _.inspect(name));
      }
    } else {
      this.assert(
          undefined !== value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name)
        , 'expected #{this} to not have ' + descriptor + _.inspect(name));
    }

    if (undefined !== val) {
      this.assert(
          val === value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
        , 'expected #{this} to not have a ' + descriptor + _.inspect(name) + ' of #{act}'
        , val
        , value
      );
    }

    flag(this, 'object', value);
  });


  /**
   * ### .ownProperty(name)
   *
   * Asserts that the target has an own property `name`.
   *
   *     expect('test').to.have.ownProperty('length');
   *
   * @name ownProperty
   * @alias haveOwnProperty
   * @param {String} name
   * @param {String} message _optional_
   * @api public
   */

  function assertOwnProperty (name, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        obj.hasOwnProperty(name)
      , 'expected #{this} to have own property ' + _.inspect(name)
      , 'expected #{this} to not have own property ' + _.inspect(name)
    );
  }

  Assertion.addMethod('ownProperty', assertOwnProperty);
  Assertion.addMethod('haveOwnProperty', assertOwnProperty);

  /**
   * ### .length(value)
   *
   * Asserts that the target's `length` property has
   * the expected value.
   *
   *     expect([ 1, 2, 3]).to.have.length(3);
   *     expect('foobar').to.have.length(6);
   *
   * Can also be used as a chain precursor to a value
   * comparison for the length property.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name length
   * @alias lengthOf
   * @param {Number} length
   * @param {String} message _optional_
   * @api public
   */

  function assertLengthChain () {
    flag(this, 'doLength', true);
  }

  function assertLength (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).to.have.property('length');
    var len = obj.length;

    this.assert(
        len == n
      , 'expected #{this} to have a length of #{exp} but got #{act}'
      , 'expected #{this} to not have a length of #{act}'
      , n
      , len
    );
  }

  Assertion.addChainableMethod('length', assertLength, assertLengthChain);
  Assertion.addMethod('lengthOf', assertLength);

  /**
   * ### .match(regexp)
   *
   * Asserts that the target matches a regular expression.
   *
   *     expect('foobar').to.match(/^foo/);
   *
   * @name match
   * @param {RegExp} RegularExpression
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('match', function (re, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        re.exec(obj)
      , 'expected #{this} to match ' + re
      , 'expected #{this} not to match ' + re
    );
  });

  /**
   * ### .string(string)
   *
   * Asserts that the string target contains another string.
   *
   *     expect('foobar').to.have.string('bar');
   *
   * @name string
   * @param {String} string
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('string', function (str, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('string');

    this.assert(
        ~obj.indexOf(str)
      , 'expected #{this} to contain ' + _.inspect(str)
      , 'expected #{this} to not contain ' + _.inspect(str)
    );
  });


  /**
   * ### .keys(key1, [key2], [...])
   *
   * Asserts that the target has exactly the given keys, or
   * asserts the inclusion of some keys when using the
   * `include` or `contain` modifiers.
   *
   *     expect({ foo: 1, bar: 2 }).to.have.keys(['foo', 'bar']);
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys('foo', 'bar');
   *
   * @name keys
   * @alias key
   * @param {String...|Array} keys
   * @api public
   */

  function assertKeys (keys) {
    var obj = flag(this, 'object')
      , str
      , ok = true;

    keys = keys instanceof Array
      ? keys
      : Array.prototype.slice.call(arguments);

    if (!keys.length) throw new Error('keys required');

    var actual = Object.keys(obj)
      , expected = keys
      , len = keys.length;

    // Inclusion
    ok = keys.every(function(key){
      return ~actual.indexOf(key);
    });

    // Strict
    if (!flag(this, 'negate') && !flag(this, 'contains')) {
      ok = ok && keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      keys = keys.map(function(key){
        return _.inspect(key);
      });
      var last = keys.pop();
      str = keys.join(', ') + ', and ' + last;
    } else {
      str = _.inspect(keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

    // Assertion
    this.assert(
        ok
      , 'expected #{this} to ' + str
      , 'expected #{this} to not ' + str
      , expected.sort()
      , actual.sort()
      , true
    );
  }

  Assertion.addMethod('keys', assertKeys);
  Assertion.addMethod('key', assertKeys);

  /**
   * ### .throw(constructor)
   *
   * Asserts that the function target will throw a specific error, or specific type of error
   * (as determined using `instanceof`), optionally with a RegExp or string inclusion test
   * for the error's message.
   *
   *     var err = new ReferenceError('This is a bad function.');
   *     var fn = function () { throw err; }
   *     expect(fn).to.throw(ReferenceError);
   *     expect(fn).to.throw(Error);
   *     expect(fn).to.throw(/bad function/);
   *     expect(fn).to.not.throw('good function');
   *     expect(fn).to.throw(ReferenceError, /bad function/);
   *     expect(fn).to.throw(err);
   *     expect(fn).to.not.throw(new RangeError('Out of range.'));
   *
   * Please note that when a throw expectation is negated, it will check each
   * parameter independently, starting with error constructor type. The appropriate way
   * to check for the existence of a type of error but for a message that does not match
   * is to use `and`.
   *
   *     expect(fn).to.throw(ReferenceError)
   *        .and.not.throw(/good function/);
   *
   * @name throw
   * @alias throws
   * @alias Throw
   * @param {ErrorConstructor} constructor
   * @param {String|RegExp} expected error message
   * @param {String} message _optional_
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @returns error for chaining (null if no error)
   * @api public
   */

  function assertThrows (constructor, errMsg, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('function');

    var thrown = false
      , desiredError = null
      , name = null
      , thrownError = null;

    if (arguments.length === 0) {
      errMsg = null;
      constructor = null;
    } else if (constructor && (constructor instanceof RegExp || 'string' === typeof constructor)) {
      errMsg = constructor;
      constructor = null;
    } else if (constructor && constructor instanceof Error) {
      desiredError = constructor;
      constructor = null;
      errMsg = null;
    } else if (typeof constructor === 'function') {
      name = constructor.prototype.name || constructor.name;
      if (name === 'Error' && constructor !== Error) {
        name = (new constructor()).name;
      }
    } else {
      constructor = null;
    }

    try {
      obj();
    } catch (err) {
      // first, check desired error
      if (desiredError) {
        this.assert(
            err === desiredError
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp}'
          , (desiredError instanceof Error ? desiredError.toString() : desiredError)
          , (err instanceof Error ? err.toString() : err)
        );

        flag(this, 'object', err);
        return this;
      }

      // next, check constructor
      if (constructor) {
        this.assert(
            err instanceof constructor
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp} but #{act} was thrown'
          , name
          , (err instanceof Error ? err.toString() : err)
        );

        if (!errMsg) {
          flag(this, 'object', err);
          return this;
        }
      }

      // next, check message
      var message = 'object' === _.type(err) && "message" in err
        ? err.message
        : '' + err;

      if ((message != null) && errMsg && errMsg instanceof RegExp) {
        this.assert(
            errMsg.exec(message)
          , 'expected #{this} to throw error matching #{exp} but got #{act}'
          , 'expected #{this} to throw error not matching #{exp}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else if ((message != null) && errMsg && 'string' === typeof errMsg) {
        this.assert(
            ~message.indexOf(errMsg)
          , 'expected #{this} to throw error including #{exp} but got #{act}'
          , 'expected #{this} to throw error not including #{act}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else {
        thrown = true;
        thrownError = err;
      }
    }

    var actuallyGot = ''
      , expectedThrown = name !== null
        ? name
        : desiredError
          ? '#{exp}' //_.inspect(desiredError)
          : 'an error';

    if (thrown) {
      actuallyGot = ' but #{act} was thrown'
    }

    this.assert(
        thrown === true
      , 'expected #{this} to throw ' + expectedThrown + actuallyGot
      , 'expected #{this} to not throw ' + expectedThrown + actuallyGot
      , (desiredError instanceof Error ? desiredError.toString() : desiredError)
      , (thrownError instanceof Error ? thrownError.toString() : thrownError)
    );

    flag(this, 'object', thrownError);
  };

  Assertion.addMethod('throw', assertThrows);
  Assertion.addMethod('throws', assertThrows);
  Assertion.addMethod('Throw', assertThrows);

  /**
   * ### .respondTo(method)
   *
   * Asserts that the object or class target will respond to a method.
   *
   *     Klass.prototype.bar = function(){};
   *     expect(Klass).to.respondTo('bar');
   *     expect(obj).to.respondTo('bar');
   *
   * To check if a constructor will respond to a static function,
   * set the `itself` flag.
   *
   *     Klass.baz = function(){};
   *     expect(Klass).itself.to.respondTo('baz');
   *
   * @name respondTo
   * @param {String} method
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('respondTo', function (method, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , itself = flag(this, 'itself')
      , context = ('function' === _.type(obj) && !itself)
        ? obj.prototype[method]
        : obj[method];

    this.assert(
        'function' === typeof context
      , 'expected #{this} to respond to ' + _.inspect(method)
      , 'expected #{this} to not respond to ' + _.inspect(method)
    );
  });

  /**
   * ### .itself
   *
   * Sets the `itself` flag, later used by the `respondTo` assertion.
   *
   *     function Foo() {}
   *     Foo.bar = function() {}
   *     Foo.prototype.baz = function() {}
   *
   *     expect(Foo).itself.to.respondTo('bar');
   *     expect(Foo).itself.not.to.respondTo('baz');
   *
   * @name itself
   * @api public
   */

  Assertion.addProperty('itself', function () {
    flag(this, 'itself', true);
  });

  /**
   * ### .satisfy(method)
   *
   * Asserts that the target passes a given truth test.
   *
   *     expect(1).to.satisfy(function(num) { return num > 0; });
   *
   * @name satisfy
   * @param {Function} matcher
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('satisfy', function (matcher, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var result = matcher(obj);
    this.assert(
        result
      , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
      , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
      , this.negate ? false : true
      , result
    );
  });

  /**
   * ### .closeTo(expected, delta)
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     expect(1.5).to.be.closeTo(1, 0.5);
   *
   * @name closeTo
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('closeTo', function (expected, delta, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj, msg).is.a('number');
    if (_.type(expected) !== 'number' || _.type(delta) !== 'number') {
      throw new Error('the arguments to closeTo must be numbers');
    }

    this.assert(
        Math.abs(obj - expected) <= delta
      , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
      , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
    );
  });

  function isSubsetOf(subset, superset, cmp) {
    return subset.every(function(elem) {
      if (!cmp) return superset.indexOf(elem) !== -1;

      return superset.some(function(elem2) {
        return cmp(elem, elem2);
      });
    })
  }

  /**
   * ### .members(set)
   *
   * Asserts that the target is a superset of `set`,
   * or that the target and `set` have the same strictly-equal (===) members.
   * Alternately, if the `deep` flag is set, set members are compared for deep
   * equality.
   *
   *     expect([1, 2, 3]).to.include.members([3, 2]);
   *     expect([1, 2, 3]).to.not.include.members([3, 2, 8]);
   *
   *     expect([4, 2]).to.have.members([2, 4]);
   *     expect([5, 2]).to.not.have.members([5, 2, 1]);
   *
   *     expect([{ id: 1 }]).to.deep.include.members([{ id: 1 }]);
   *
   * @name members
   * @param {Array} set
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('members', function (subset, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj).to.be.an('array');
    new Assertion(subset).to.be.an('array');

    var cmp = flag(this, 'deep') ? _.eql : undefined;

    if (flag(this, 'contains')) {
      return this.assert(
          isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to be a superset of #{act}'
        , 'expected #{this} to not be a superset of #{act}'
        , obj
        , subset
      );
    }

    this.assert(
        isSubsetOf(obj, subset, cmp) && isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to have the same members as #{act}'
        , 'expected #{this} to not have the same members as #{act}'
        , obj
        , subset
    );
  });
};

},{}],11:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


module.exports = function (chai, util) {

  /*!
   * Chai dependencies.
   */

  var Assertion = chai.Assertion
    , flag = util.flag;

  /*!
   * Module export.
   */

  /**
   * ### assert(expression, message)
   *
   * Write your own test expressions.
   *
   *     assert('foo' !== 'bar', 'foo is not bar');
   *     assert(Array.isArray([]), 'empty arrays are arrays');
   *
   * @param {Mixed} expression to test for truthiness
   * @param {String} message to display on error
   * @name assert
   * @api public
   */

  var assert = chai.assert = function (express, errmsg) {
    var test = new Assertion(null, null, chai.assert);
    test.assert(
        express
      , errmsg
      , '[ negation message unavailable ]'
    );
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure. Node.js `assert` module-compatible.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @api public
   */

  assert.fail = function (actual, expected, message, operator) {
    message = message || 'assert.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, assert.fail);
  };

  /**
   * ### .ok(object, [message])
   *
   * Asserts that `object` is truthy.
   *
   *     assert.ok('everything', 'everything is ok');
   *     assert.ok(false, 'this will fail');
   *
   * @name ok
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.ok = function (val, msg) {
    new Assertion(val, msg).is.ok;
  };

  /**
   * ### .notOk(object, [message])
   *
   * Asserts that `object` is falsy.
   *
   *     assert.notOk('everything', 'this will fail');
   *     assert.notOk(false, 'this will pass');
   *
   * @name notOk
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.notOk = function (val, msg) {
    new Assertion(val, msg).is.not.ok;
  };

  /**
   * ### .equal(actual, expected, [message])
   *
   * Asserts non-strict equality (`==`) of `actual` and `expected`.
   *
   *     assert.equal(3, '3', '== coerces values to strings');
   *
   * @name equal
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.equal = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.equal);

    test.assert(
        exp == flag(test, 'object')
      , 'expected #{this} to equal #{exp}'
      , 'expected #{this} to not equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .notEqual(actual, expected, [message])
   *
   * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
   *
   *     assert.notEqual(3, 4, 'these numbers are not equal');
   *
   * @name notEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notEqual = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.notEqual);

    test.assert(
        exp != flag(test, 'object')
      , 'expected #{this} to not equal #{exp}'
      , 'expected #{this} to equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .strictEqual(actual, expected, [message])
   *
   * Asserts strict equality (`===`) of `actual` and `expected`.
   *
   *     assert.strictEqual(true, true, 'these booleans are strictly equal');
   *
   * @name strictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.strictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.equal(exp);
  };

  /**
   * ### .notStrictEqual(actual, expected, [message])
   *
   * Asserts strict inequality (`!==`) of `actual` and `expected`.
   *
   *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
   *
   * @name notStrictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notStrictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.equal(exp);
  };

  /**
   * ### .deepEqual(actual, expected, [message])
   *
   * Asserts that `actual` is deeply equal to `expected`.
   *
   *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
   *
   * @name deepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.deepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.eql(exp);
  };

  /**
   * ### .notDeepEqual(actual, expected, [message])
   *
   * Assert that `actual` is not deeply equal to `expected`.
   *
   *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
   *
   * @name notDeepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notDeepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.eql(exp);
  };

  /**
   * ### .isTrue(value, [message])
   *
   * Asserts that `value` is true.
   *
   *     var teaServed = true;
   *     assert.isTrue(teaServed, 'the tea has been served');
   *
   * @name isTrue
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isTrue = function (val, msg) {
    new Assertion(val, msg).is['true'];
  };

  /**
   * ### .isFalse(value, [message])
   *
   * Asserts that `value` is false.
   *
   *     var teaServed = false;
   *     assert.isFalse(teaServed, 'no tea yet? hmm...');
   *
   * @name isFalse
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFalse = function (val, msg) {
    new Assertion(val, msg).is['false'];
  };

  /**
   * ### .isNull(value, [message])
   *
   * Asserts that `value` is null.
   *
   *     assert.isNull(err, 'there was no error');
   *
   * @name isNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNull = function (val, msg) {
    new Assertion(val, msg).to.equal(null);
  };

  /**
   * ### .isNotNull(value, [message])
   *
   * Asserts that `value` is not null.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotNull(tea, 'great, time for tea!');
   *
   * @name isNotNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNull = function (val, msg) {
    new Assertion(val, msg).to.not.equal(null);
  };

  /**
   * ### .isUndefined(value, [message])
   *
   * Asserts that `value` is `undefined`.
   *
   *     var tea;
   *     assert.isUndefined(tea, 'no tea defined');
   *
   * @name isUndefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isUndefined = function (val, msg) {
    new Assertion(val, msg).to.equal(undefined);
  };

  /**
   * ### .isDefined(value, [message])
   *
   * Asserts that `value` is not `undefined`.
   *
   *     var tea = 'cup of chai';
   *     assert.isDefined(tea, 'tea has been defined');
   *
   * @name isDefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isDefined = function (val, msg) {
    new Assertion(val, msg).to.not.equal(undefined);
  };

  /**
   * ### .isFunction(value, [message])
   *
   * Asserts that `value` is a function.
   *
   *     function serveTea() { return 'cup of tea'; };
   *     assert.isFunction(serveTea, 'great, we can have tea now');
   *
   * @name isFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFunction = function (val, msg) {
    new Assertion(val, msg).to.be.a('function');
  };

  /**
   * ### .isNotFunction(value, [message])
   *
   * Asserts that `value` is _not_ a function.
   *
   *     var serveTea = [ 'heat', 'pour', 'sip' ];
   *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
   *
   * @name isNotFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotFunction = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('function');
  };

  /**
   * ### .isObject(value, [message])
   *
   * Asserts that `value` is an object (as revealed by
   * `Object.prototype.toString`).
   *
   *     var selection = { name: 'Chai', serve: 'with spices' };
   *     assert.isObject(selection, 'tea selection is an object');
   *
   * @name isObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isObject = function (val, msg) {
    new Assertion(val, msg).to.be.a('object');
  };

  /**
   * ### .isNotObject(value, [message])
   *
   * Asserts that `value` is _not_ an object.
   *
   *     var selection = 'chai'
   *     assert.isNotObject(selection, 'tea selection is not an object');
   *     assert.isNotObject(null, 'null is not an object');
   *
   * @name isNotObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotObject = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('object');
  };

  /**
   * ### .isArray(value, [message])
   *
   * Asserts that `value` is an array.
   *
   *     var menu = [ 'green', 'chai', 'oolong' ];
   *     assert.isArray(menu, 'what kind of tea do we want?');
   *
   * @name isArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isArray = function (val, msg) {
    new Assertion(val, msg).to.be.an('array');
  };

  /**
   * ### .isNotArray(value, [message])
   *
   * Asserts that `value` is _not_ an array.
   *
   *     var menu = 'green|chai|oolong';
   *     assert.isNotArray(menu, 'what kind of tea do we want?');
   *
   * @name isNotArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotArray = function (val, msg) {
    new Assertion(val, msg).to.not.be.an('array');
  };

  /**
   * ### .isString(value, [message])
   *
   * Asserts that `value` is a string.
   *
   *     var teaOrder = 'chai';
   *     assert.isString(teaOrder, 'order placed');
   *
   * @name isString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isString = function (val, msg) {
    new Assertion(val, msg).to.be.a('string');
  };

  /**
   * ### .isNotString(value, [message])
   *
   * Asserts that `value` is _not_ a string.
   *
   *     var teaOrder = 4;
   *     assert.isNotString(teaOrder, 'order placed');
   *
   * @name isNotString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotString = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('string');
  };

  /**
   * ### .isNumber(value, [message])
   *
   * Asserts that `value` is a number.
   *
   *     var cups = 2;
   *     assert.isNumber(cups, 'how many cups');
   *
   * @name isNumber
   * @param {Number} value
   * @param {String} message
   * @api public
   */

  assert.isNumber = function (val, msg) {
    new Assertion(val, msg).to.be.a('number');
  };

  /**
   * ### .isNotNumber(value, [message])
   *
   * Asserts that `value` is _not_ a number.
   *
   *     var cups = '2 cups please';
   *     assert.isNotNumber(cups, 'how many cups');
   *
   * @name isNotNumber
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNumber = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('number');
  };

  /**
   * ### .isBoolean(value, [message])
   *
   * Asserts that `value` is a boolean.
   *
   *     var teaReady = true
   *       , teaServed = false;
   *
   *     assert.isBoolean(teaReady, 'is the tea ready');
   *     assert.isBoolean(teaServed, 'has tea been served');
   *
   * @name isBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isBoolean = function (val, msg) {
    new Assertion(val, msg).to.be.a('boolean');
  };

  /**
   * ### .isNotBoolean(value, [message])
   *
   * Asserts that `value` is _not_ a boolean.
   *
   *     var teaReady = 'yep'
   *       , teaServed = 'nope';
   *
   *     assert.isNotBoolean(teaReady, 'is the tea ready');
   *     assert.isNotBoolean(teaServed, 'has tea been served');
   *
   * @name isNotBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotBoolean = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('boolean');
  };

  /**
   * ### .typeOf(value, name, [message])
   *
   * Asserts that `value`'s type is `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
   *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
   *     assert.typeOf('tea', 'string', 'we have a string');
   *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
   *     assert.typeOf(null, 'null', 'we have a null');
   *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
   *
   * @name typeOf
   * @param {Mixed} value
   * @param {String} name
   * @param {String} message
   * @api public
   */

  assert.typeOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.a(type);
  };

  /**
   * ### .notTypeOf(value, name, [message])
   *
   * Asserts that `value`'s type is _not_ `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
   *
   * @name notTypeOf
   * @param {Mixed} value
   * @param {String} typeof name
   * @param {String} message
   * @api public
   */

  assert.notTypeOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.a(type);
  };

  /**
   * ### .instanceOf(object, constructor, [message])
   *
   * Asserts that `value` is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new Tea('chai');
   *
   *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
   *
   * @name instanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.instanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.instanceOf(type);
  };

  /**
   * ### .notInstanceOf(object, constructor, [message])
   *
   * Asserts `value` is not an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new String('chai');
   *
   *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
   *
   * @name notInstanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.notInstanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.instanceOf(type);
  };

  /**
   * ### .include(haystack, needle, [message])
   *
   * Asserts that `haystack` includes `needle`. Works
   * for strings and arrays.
   *
   *     assert.include('foobar', 'bar', 'foobar contains string "bar"');
   *     assert.include([ 1, 2, 3 ], 3, 'array contains value');
   *
   * @name include
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.include = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.include).include(inc);
  };

  /**
   * ### .notInclude(haystack, needle, [message])
   *
   * Asserts that `haystack` does not include `needle`. Works
   * for strings and arrays.
   *i
   *     assert.notInclude('foobar', 'baz', 'string not include substring');
   *     assert.notInclude([ 1, 2, 3 ], 4, 'array not include contain value');
   *
   * @name notInclude
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.notInclude = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.notInclude).not.include(inc);
  };

  /**
   * ### .match(value, regexp, [message])
   *
   * Asserts that `value` matches the regular expression `regexp`.
   *
   *     assert.match('foobar', /^foo/, 'regexp matches');
   *
   * @name match
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.match = function (exp, re, msg) {
    new Assertion(exp, msg).to.match(re);
  };

  /**
   * ### .notMatch(value, regexp, [message])
   *
   * Asserts that `value` does not match the regular expression `regexp`.
   *
   *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
   *
   * @name notMatch
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.notMatch = function (exp, re, msg) {
    new Assertion(exp, msg).to.not.match(re);
  };

  /**
   * ### .property(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`.
   *
   *     assert.property({ tea: { green: 'matcha' }}, 'tea');
   *
   * @name property
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.property = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.property(prop);
  };

  /**
   * ### .notProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`.
   *
   *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
   *
   * @name notProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.property(prop);
  };

  /**
   * ### .deepProperty(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`, which can be a
   * string using dot- and bracket-notation for deep reference.
   *
   *     assert.deepProperty({ tea: { green: 'matcha' }}, 'tea.green');
   *
   * @name deepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.deepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop);
  };

  /**
   * ### .notDeepProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`, which
   * can be a string using dot- and bracket-notation for deep reference.
   *
   *     assert.notDeepProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
   *
   * @name notDeepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notDeepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop);
  };

  /**
   * ### .propertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`.
   *
   *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
   *
   * @name propertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.property(prop, val);
  };

  /**
   * ### .propertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`.
   *
   *     assert.propertyNotVal({ tea: 'is good' }, 'tea', 'is bad');
   *
   * @name propertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.property(prop, val);
  };

  /**
   * ### .deepPropertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`. `property` can use dot- and bracket-notation for deep
   * reference.
   *
   *     assert.deepPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
   *
   * @name deepPropertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop, val);
  };

  /**
   * ### .deepPropertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`. `property` can use dot- and
   * bracket-notation for deep reference.
   *
   *     assert.deepPropertyNotVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
   *
   * @name deepPropertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop, val);
  };

  /**
   * ### .lengthOf(object, length, [message])
   *
   * Asserts that `object` has a `length` property with the expected value.
   *
   *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
   *     assert.lengthOf('foobar', 5, 'string has length of 6');
   *
   * @name lengthOf
   * @param {Mixed} object
   * @param {Number} length
   * @param {String} message
   * @api public
   */

  assert.lengthOf = function (exp, len, msg) {
    new Assertion(exp, msg).to.have.length(len);
  };

  /**
   * ### .throws(function, [constructor/string/regexp], [string/regexp], [message])
   *
   * Asserts that `function` will throw an error that is an instance of
   * `constructor`, or alternately that it will throw an error with message
   * matching `regexp`.
   *
   *     assert.throw(fn, 'function throws a reference error');
   *     assert.throw(fn, /function throws a reference error/);
   *     assert.throw(fn, ReferenceError);
   *     assert.throw(fn, ReferenceError, 'function throws a reference error');
   *     assert.throw(fn, ReferenceError, /function throws a reference error/);
   *
   * @name throws
   * @alias throw
   * @alias Throw
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.Throw = function (fn, errt, errs, msg) {
    if ('string' === typeof errt || errt instanceof RegExp) {
      errs = errt;
      errt = null;
    }

    var assertErr = new Assertion(fn, msg).to.Throw(errt, errs);
    return flag(assertErr, 'object');
  };

  /**
   * ### .doesNotThrow(function, [constructor/regexp], [message])
   *
   * Asserts that `function` will _not_ throw an error that is an instance of
   * `constructor`, or alternately that it will not throw an error with message
   * matching `regexp`.
   *
   *     assert.doesNotThrow(fn, Error, 'function does not throw');
   *
   * @name doesNotThrow
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.doesNotThrow = function (fn, type, msg) {
    if ('string' === typeof type) {
      msg = type;
      type = null;
    }

    new Assertion(fn, msg).to.not.Throw(type);
  };

  /**
   * ### .operator(val1, operator, val2, [message])
   *
   * Compares two values using `operator`.
   *
   *     assert.operator(1, '<', 2, 'everything is ok');
   *     assert.operator(1, '>', 2, 'this will fail');
   *
   * @name operator
   * @param {Mixed} val1
   * @param {String} operator
   * @param {Mixed} val2
   * @param {String} message
   * @api public
   */

  assert.operator = function (val, operator, val2, msg) {
    if (!~['==', '===', '>', '>=', '<', '<=', '!=', '!=='].indexOf(operator)) {
      throw new Error('Invalid operator "' + operator + '"');
    }
    var test = new Assertion(eval(val + operator + val2), msg);
    test.assert(
        true === flag(test, 'object')
      , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
      , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
  };

  /**
   * ### .closeTo(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
   *
   * @name closeTo
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @api public
   */

  assert.closeTo = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.closeTo(exp, delta);
  };

  /**
   * ### .sameMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members.
   * Order is not taken into account.
   *
   *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
   *
   * @name sameMembers
   * @param {Array} set1
   * @param {Array} set2
   * @param {String} message
   * @api public
   */

  assert.sameMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.members(set2);
  }

  /**
   * ### .includeMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset`.
   * Order is not taken into account.
   *
   *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1 ], 'include members');
   *
   * @name includeMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.includeMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.members(subset);
  }

  /*!
   * Undocumented / untested
   */

  assert.ifError = function (val, msg) {
    new Assertion(val, msg).to.not.be.ok;
  };

  /*!
   * Aliases.
   */

  (function alias(name, as){
    assert[as] = assert[name];
    return alias;
  })
  ('Throw', 'throw')
  ('Throw', 'throws');
};

},{}],12:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  chai.expect = function (val, message) {
    return new chai.Assertion(val, message);
  };
};


},{}],13:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  var Assertion = chai.Assertion;

  function loadShould () {
    // explicitly define this method as function as to have it's name to include as `ssfi`
    function shouldGetter() {
      if (this instanceof String || this instanceof Number) {
        return new Assertion(this.constructor(this), null, shouldGetter);
      } else if (this instanceof Boolean) {
        return new Assertion(this == true, null, shouldGetter);
      }
      return new Assertion(this, null, shouldGetter);
    }
    function shouldSetter(value) {
      // See https://github.com/chaijs/chai/issues/86: this makes
      // `whatever.should = someValue` actually set `someValue`, which is
      // especially useful for `global.should = require('chai').should()`.
      //
      // Note that we have to use [[DefineProperty]] instead of [[Put]]
      // since otherwise we would trigger this very setter!
      Object.defineProperty(this, 'should', {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    // modify Object.prototype to have `should`
    Object.defineProperty(Object.prototype, 'should', {
      set: shouldSetter
      , get: shouldGetter
      , configurable: true
    });

    var should = {};

    should.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.equal(val2);
    };

    should.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.Throw(errt, errs);
    };

    should.exist = function (val, msg) {
      new Assertion(val, msg).to.exist;
    }

    // negation
    should.not = {}

    should.not.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.not.equal(val2);
    };

    should.not.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.not.Throw(errt, errs);
    };

    should.not.exist = function (val, msg) {
      new Assertion(val, msg).to.not.exist;
    }

    should['throw'] = should['Throw'];
    should.not['throw'] = should.not['Throw'];

    return should;
  };

  chai.should = loadShould;
  chai.Should = loadShould;
};

},{}],14:[function(require,module,exports){
/*!
 * Chai - addChainingMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var transferFlags = require('./transferFlags');
var flag = require('./flag');
var config = require('../config');

/*!
 * Module variables
 */

// Check whether `__proto__` is supported
var hasProtoSupport = '__proto__' in Object;

// Without `__proto__` support, this module will need to add properties to a function.
// However, some Function.prototype methods cannot be overwritten,
// and there seems no easy cross-platform way to detect them (@see chaijs/chai/issues/69).
var excludeNames = /^(?:length|name|arguments|caller)$/;

// Cache `Function` properties
var call  = Function.prototype.call,
    apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @name addChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== 'function') {
    chainingBehavior = function () { };
  }

  var chainableBehavior = {
      method: method
    , chainingBehavior: chainingBehavior
  };

  // save the methods so we can overwrite them later, if we need to.
  if (!ctx.__methods) {
    ctx.__methods = {};
  }
  ctx.__methods[name] = chainableBehavior;

  Object.defineProperty(ctx, name,
    { get: function () {
        chainableBehavior.chainingBehavior.call(this);

        var assert = function assert() {
          var old_ssfi = flag(this, 'ssfi');
          if (old_ssfi && config.includeStack === false)
            flag(this, 'ssfi', assert);
          var result = chainableBehavior.method.apply(this, arguments);
          return result === undefined ? this : result;
        };

        // Use `__proto__` if available
        if (hasProtoSupport) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = assert.__proto__ = Object.create(this);
          // Restore the `call` and `apply` methods from `Function`
          prototype.call = call;
          prototype.apply = apply;
        }
        // Otherwise, redefine all properties (slow!)
        else {
          var asserterNames = Object.getOwnPropertyNames(ctx);
          asserterNames.forEach(function (asserterName) {
            if (!excludeNames.test(asserterName)) {
              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(assert, asserterName, pd);
            }
          });
        }

        transferFlags(this, assert);
        return assert;
      }
    , configurable: true
  });
};

},{"../config":9,"./flag":17,"./transferFlags":31}],15:[function(require,module,exports){
/*!
 * Chai - addMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('../config');

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @name addMethod
 * @api public
 */
var flag = require('./flag');

module.exports = function (ctx, name, method) {
  ctx[name] = function () {
    var old_ssfi = flag(this, 'ssfi');
    if (old_ssfi && config.includeStack === false)
      flag(this, 'ssfi', ctx[name]);
    var result = method.apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{"../config":9,"./flag":17}],16:[function(require,module,exports){
/*!
 * Chai - addProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @name addProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter.call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],17:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### flag(object ,key, [value])
 *
 * Get or set a flag value on an object. If a
 * value is provided it will be set, else it will
 * return the currently set value or `undefined` if
 * the value is not set.
 *
 *     utils.flag(this, 'foo', 'bar'); // setter
 *     utils.flag(this, 'foo'); // getter, returns `bar`
 *
 * @param {Object} object (constructed Assertion
 * @param {String} key
 * @param {Mixed} value (optional)
 * @name flag
 * @api private
 */

module.exports = function (obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
};

},{}],18:[function(require,module,exports){
/*!
 * Chai - getActual utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getActual(object, [actual])
 *
 * Returns the `actual` value for an Assertion
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
};

},{}],19:[function(require,module,exports){
/*!
 * Chai - getEnumerableProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getEnumerableProperties
 * @api public
 */

module.exports = function getEnumerableProperties(object) {
  var result = [];
  for (var name in object) {
    result.push(name);
  }
  return result;
};

},{}],20:[function(require,module,exports){
/*!
 * Chai - message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag')
  , getActual = require('./getActual')
  , inspect = require('./inspect')
  , objDisplay = require('./objDisplay');

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @name getMessage
 * @api public
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , val = flag(obj, 'object')
    , expected = args[3]
    , actual = getActual(obj, args)
    , msg = negate ? args[2] : args[1]
    , flagMsg = flag(obj, 'message');

  if(typeof msg === "function") msg = msg();
  msg = msg || '';
  msg = msg
    .replace(/#{this}/g, objDisplay(val))
    .replace(/#{act}/g, objDisplay(actual))
    .replace(/#{exp}/g, objDisplay(expected));

  return flagMsg ? flagMsg + ': ' + msg : msg;
};

},{"./flag":17,"./getActual":18,"./inspect":25,"./objDisplay":26}],21:[function(require,module,exports){
/*!
 * Chai - getName utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getName(func)
 *
 * Gets the name of a function, in a cross-browser way.
 *
 * @param {Function} a function (usually a constructor)
 */

module.exports = function (func) {
  if (func.name) return func.name;

  var match = /^\s?function ([^(]*)\(/.exec(func);
  return match && match[1] ? match[1] : "";
};

},{}],22:[function(require,module,exports){
/*!
 * Chai - getPathValue utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * @see https://github.com/logicalparadox/filtr
 * MIT Licensed
 */

/**
 * ### .getPathValue(path, object)
 *
 * This allows the retrieval of values in an
 * object given a string path.
 *
 *     var obj = {
 *         prop1: {
 *             arr: ['a', 'b', 'c']
 *           , str: 'Hello'
 *         }
 *       , prop2: {
 *             arr: [ { nested: 'Universe' } ]
 *           , str: 'Hello again!'
 *         }
 *     }
 *
 * The following would be the results.
 *
 *     getPathValue('prop1.str', obj); // Hello
 *     getPathValue('prop1.att[2]', obj); // b
 *     getPathValue('prop2.arr[0].nested', obj); // Universe
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} value or `undefined`
 * @name getPathValue
 * @api public
 */

var getPathValue = module.exports = function (path, obj) {
  var parsed = parsePath(path);
  return _getPathValue(parsed, obj);
};

/*!
 * ## parsePath(path)
 *
 * Helper function used to parse string object
 * paths. Use in conjunction with `_getPathValue`.
 *
 *      var parsed = parsePath('myobject.property.subprop');
 *
 * ### Paths:
 *
 * * Can be as near infinitely deep and nested
 * * Arrays are also valid using the formal `myobject.document[3].property`.
 *
 * @param {String} path
 * @returns {Object} parsed
 * @api private
 */

function parsePath (path) {
  var str = path.replace(/\[/g, '.[')
    , parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map(function (value) {
    var re = /\[(\d+)\]$/
      , mArr = re.exec(value)
    if (mArr) return { i: parseFloat(mArr[1]) };
    else return { p: value };
  });
};

/*!
 * ## _getPathValue(parsed, obj)
 *
 * Helper companion function for `.parsePath` that returns
 * the value located at the parsed address.
 *
 *      var value = getPathValue(parsed, obj);
 *
 * @param {Object} parsed definition from `parsePath`.
 * @param {Object} object to search against
 * @returns {Object|Undefined} value
 * @api private
 */

function _getPathValue (parsed, obj) {
  var tmp = obj
    , res;
  for (var i = 0, l = parsed.length; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if ('undefined' !== typeof part.p)
        tmp = tmp[part.p];
      else if ('undefined' !== typeof part.i)
        tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
};

},{}],23:[function(require,module,exports){
/*!
 * Chai - getProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
  var result = Object.getOwnPropertyNames(subject);

  function addProperty(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }

  var proto = Object.getPrototypeOf(subject);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty);
    proto = Object.getPrototypeOf(proto);
  }

  return result;
};

},{}],24:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Main exports
 */

var exports = module.exports = {};

/*!
 * test utility
 */

exports.test = require('./test');

/*!
 * type utility
 */

exports.type = require('./type');

/*!
 * message utility
 */

exports.getMessage = require('./getMessage');

/*!
 * actual utility
 */

exports.getActual = require('./getActual');

/*!
 * Inspect util
 */

exports.inspect = require('./inspect');

/*!
 * Object Display util
 */

exports.objDisplay = require('./objDisplay');

/*!
 * Flag utility
 */

exports.flag = require('./flag');

/*!
 * Flag transferring utility
 */

exports.transferFlags = require('./transferFlags');

/*!
 * Deep equal utility
 */

exports.eql = require('deep-eql');

/*!
 * Deep path value
 */

exports.getPathValue = require('./getPathValue');

/*!
 * Function name
 */

exports.getName = require('./getName');

/*!
 * add Property
 */

exports.addProperty = require('./addProperty');

/*!
 * add Method
 */

exports.addMethod = require('./addMethod');

/*!
 * overwrite Property
 */

exports.overwriteProperty = require('./overwriteProperty');

/*!
 * overwrite Method
 */

exports.overwriteMethod = require('./overwriteMethod');

/*!
 * Add a chainable method
 */

exports.addChainableMethod = require('./addChainableMethod');

/*!
 * Overwrite chainable method
 */

exports.overwriteChainableMethod = require('./overwriteChainableMethod');


},{"./addChainableMethod":14,"./addMethod":15,"./addProperty":16,"./flag":17,"./getActual":18,"./getMessage":20,"./getName":21,"./getPathValue":22,"./inspect":25,"./objDisplay":26,"./overwriteChainableMethod":27,"./overwriteMethod":28,"./overwriteProperty":29,"./test":30,"./transferFlags":31,"./type":32,"deep-eql":34}],25:[function(require,module,exports){
// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js

var getName = require('./getName');
var getProperties = require('./getProperties');
var getEnumerableProperties = require('./getEnumerableProperties');

module.exports = inspect;

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: function (str) { return str; }
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}

// Returns true if object is a DOM element.
var isDOMElement = function (object) {
  if (typeof HTMLElement === 'object') {
    return object instanceof HTMLElement;
  } else {
    return object &&
      typeof object === 'object' &&
      object.nodeType === 1 &&
      typeof object.nodeName === 'string';
  }
};

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (typeof ret !== 'string') {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // If this is a DOM element, try to get the outer HTML.
  if (isDOMElement(value)) {
    if ('outerHTML' in value) {
      return value.outerHTML;
      // This value does not have an outerHTML attribute,
      //   it could still be an XML element
    } else {
      // Attempt to serialize it
      try {
        if (document.xmlVersion) {
          var xmlSerializer = new XMLSerializer();
          return xmlSerializer.serializeToString(value);
        } else {
          // Firefox 11- do not support outerHTML
          //   It does, however, support innerHTML
          //   Use the following to render the element
          var ns = "http://www.w3.org/1999/xhtml";
          var container = document.createElementNS(ns, '_');

          container.appendChild(value.cloneNode(false));
          html = container.innerHTML
            .replace('><', '>' + value.innerHTML + '<');
          container.innerHTML = '';
          return html;
        }
      } catch (err) {
        // This could be a non-native DOM implementation,
        //   continue with the normal flow:
        //   printing the element as if it is an object.
      }
    }
  }

  // Look up the keys of the object.
  var visibleKeys = getEnumerableProperties(value);
  var keys = ctx.showHidden ? getProperties(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
  // a `stack` plus `description` property; ignore those for consistency.
  if (keys.length === 0 || (isError(value) && (
      (keys.length === 1 && keys[0] === 'stack') ||
      (keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')
     ))) {
    if (typeof value === 'function') {
      var name = getName(value);
      var nameSuffix = name ? ': ' + name : '';
      return ctx.stylize('[Function' + nameSuffix + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var name = getName(value);
    var nameSuffix = name ? ': ' + name : '';
    base = ' [Function' + nameSuffix + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    return formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str;
  if (value.__lookupGetter__) {
    if (value.__lookupGetter__(key)) {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(value[key]) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, value[key], null);
      } else {
        str = formatValue(ctx, value[key], recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}

function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"./getEnumerableProperties":19,"./getName":21,"./getProperties":23}],26:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var inspect = require('./inspect');
var config = require('../config');

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @api public
 */

module.exports = function (obj) {
  var str = inspect(obj)
    , type = Object.prototype.toString.call(obj);

  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type === '[object Function]') {
      return !obj.name || obj.name === ''
        ? '[Function]'
        : '[Function: ' + obj.name + ']';
    } else if (type === '[object Array]') {
      return '[ Array(' + obj.length + ') ]';
    } else if (type === '[object Object]') {
      var keys = Object.keys(obj)
        , kstr = keys.length > 2
          ? keys.splice(0, 2).join(', ') + ', ...'
          : keys.join(', ');
      return '{ Object (' + kstr + ') }';
    } else {
      return str;
    }
  } else {
    return str;
  }
};

},{"../config":9,"./inspect":25}],27:[function(require,module,exports){
/*!
 * Chai - overwriteChainableMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteChainableMethod (ctx, name, fn)
 *
 * Overwites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'length',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.length(3);
 *     expect(myFoo).to.have.length.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @name overwriteChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  var chainableBehavior = ctx.__methods[name];

  var _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = function () {
    var result = chainingBehavior(_chainingBehavior).call(this);
    return result === undefined ? this : result;
  };

  var _method = chainableBehavior.method;
  chainableBehavior.method = function () {
    var result = method(_method).apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{}],28:[function(require,module,exports){
/*!
 * Chai - overwriteMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @name overwriteMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  var _method = ctx[name]
    , _super = function () { return this; };

  if (_method && 'function' === typeof _method)
    _super = _method;

  ctx[name] = function () {
    var result = method(_super).apply(this, arguments);
    return result === undefined ? this : result;
  }
};

},{}],29:[function(require,module,exports){
/*!
 * Chai - overwriteProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteProperty (ctx, name, fn)
 *
 * Overwites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @name overwriteProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  var _get = Object.getOwnPropertyDescriptor(ctx, name)
    , _super = function () {};

  if (_get && 'function' === typeof _get.get)
    _super = _get.get

  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter(_super).call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],30:[function(require,module,exports){
/*!
 * Chai - test utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag');

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , expr = args[0];
  return negate ? !expr : expr;
};

},{"./flag":17}],31:[function(require,module,exports){
/*!
 * Chai - transferFlags utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base Chai
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = new Assertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = new Assertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags too; usually a new assertion
 * @param {Boolean} includeAll
 * @name getAllFlags
 * @api private
 */

module.exports = function (assertion, object, includeAll) {
  var flags = assertion.__flags || (assertion.__flags = Object.create(null));

  if (!object.__flags) {
    object.__flags = Object.create(null);
  }

  includeAll = arguments.length === 3 ? includeAll : true;

  for (var flag in flags) {
    if (includeAll ||
        (flag !== 'object' && flag !== 'ssfi' && flag != 'message')) {
      object.__flags[flag] = flags[flag];
    }
  }
};

},{}],32:[function(require,module,exports){
/*!
 * Chai - type utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Arguments]': 'arguments'
  , '[object Array]': 'array'
  , '[object Date]': 'date'
  , '[object Function]': 'function'
  , '[object Number]': 'number'
  , '[object RegExp]': 'regexp'
  , '[object String]': 'string'
};

/**
 * ### type(object)
 *
 * Better implementation of `typeof` detection that can
 * be used cross-browser. Handles the inconsistencies of
 * Array, `null`, and `undefined` detection.
 *
 *     utils.type({}) // 'object'
 *     utils.type(null) // `null'
 *     utils.type(undefined) // `undefined`
 *     utils.type([]) // `array`
 *
 * @param {Mixed} object to detect type of
 * @name type
 * @api private
 */

module.exports = function (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
};

},{}],33:[function(require,module,exports){
/*!
 * assertion-error
 * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

function exclude () {
  var excludes = [].slice.call(arguments);

  function excludeProps (res, obj) {
    Object.keys(obj).forEach(function (key) {
      if (!~excludes.indexOf(key)) res[key] = obj[key];
    });
  }

  return function extendExclude () {
    var args = [].slice.call(arguments)
      , i = 0
      , res = {};

    for (; i < args.length; i++) {
      excludeProps(res, args[i]);
    }

    return res;
  };
};

/*!
 * Primary Exports
 */

module.exports = AssertionError;

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

function AssertionError (message, _props, ssf) {
  var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
    , props = extend(_props || {});

  // default values
  this.message = message || 'Unspecified AssertionError';
  this.showDiff = false;

  // copy from properties
  for (var key in props) {
    this[key] = props[key];
  }

  // capture stack trace
  ssf = ssf || arguments.callee;
  if (ssf && Error.captureStackTrace) {
    Error.captureStackTrace(this, ssf);
  }
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param {Boolean} include stack (default: `true`)
 * @return {Object} object that can be `JSON.stringify`
 */

AssertionError.prototype.toJSON = function (stack) {
  var extend = exclude('constructor', 'toJSON', 'stack')
    , props = extend({ name: this.name }, this);

  // include stack if exists and not turned off
  if (false !== stack && this.stack) {
    props.stack = this.stack;
  }

  return props;
};

},{}],34:[function(require,module,exports){
module.exports = require('./lib/eql');

},{"./lib/eql":35}],35:[function(require,module,exports){
/*!
 * deep-eql
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var type = require('type-detect');

/*!
 * Buffer.isBuffer browser shim
 */

var Buffer;
try { Buffer = require('buffer').Buffer; }
catch(ex) {
  Buffer = {};
  Buffer.isBuffer = function() { return false; }
}

/*!
 * Primary Export
 */

module.exports = deepEqual;

/**
 * Assert super-strict (egal) equality between
 * two objects of any type.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @param {Array} memoised (optional)
 * @return {Boolean} equal match
 */

function deepEqual(a, b, m) {
  if (sameValue(a, b)) {
    return true;
  } else if ('date' === type(a)) {
    return dateEqual(a, b);
  } else if ('regexp' === type(a)) {
    return regexpEqual(a, b);
  } else if (Buffer.isBuffer(a)) {
    return bufferEqual(a, b);
  } else if ('arguments' === type(a)) {
    return argumentsEqual(a, b, m);
  } else if (!typeEqual(a, b)) {
    return false;
  } else if (('object' !== type(a) && 'object' !== type(b))
  && ('array' !== type(a) && 'array' !== type(b))) {
    return sameValue(a, b);
  } else {
    return objectEqual(a, b, m);
  }
}

/*!
 * Strict (egal) equality test. Ensures that NaN always
 * equals NaN and `-0` does not equal `+0`.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} equal match
 */

function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

/*!
 * Compare the types of two given objects and
 * return if they are equal. Note that an Array
 * has a type of `array` (not `object`) and arguments
 * have a type of `arguments` (not `array`/`object`).
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function typeEqual(a, b) {
  return type(a) === type(b);
}

/*!
 * Compare two Date objects by asserting that
 * the time values are equal using `saveValue`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {Boolean} result
 */

function dateEqual(a, b) {
  if ('date' !== type(b)) return false;
  return sameValue(a.getTime(), b.getTime());
}

/*!
 * Compare two regular expressions by converting them
 * to string and checking for `sameValue`.
 *
 * @param {RegExp} a
 * @param {RegExp} b
 * @return {Boolean} result
 */

function regexpEqual(a, b) {
  if ('regexp' !== type(b)) return false;
  return sameValue(a.toString(), b.toString());
}

/*!
 * Assert deep equality of two `arguments` objects.
 * Unfortunately, these must be sliced to arrays
 * prior to test to ensure no bad behavior.
 *
 * @param {Arguments} a
 * @param {Arguments} b
 * @param {Array} memoize (optional)
 * @return {Boolean} result
 */

function argumentsEqual(a, b, m) {
  if ('arguments' !== type(b)) return false;
  a = [].slice.call(a);
  b = [].slice.call(b);
  return deepEqual(a, b, m);
}

/*!
 * Get enumerable properties of a given object.
 *
 * @param {Object} a
 * @return {Array} property names
 */

function enumerable(a) {
  var res = [];
  for (var key in a) res.push(key);
  return res;
}

/*!
 * Simple equality for flat iterable objects
 * such as Arrays or Node.js buffers.
 *
 * @param {Iterable} a
 * @param {Iterable} b
 * @return {Boolean} result
 */

function iterableEqual(a, b) {
  if (a.length !==  b.length) return false;

  var i = 0;
  var match = true;

  for (; i < a.length; i++) {
    if (a[i] !== b[i]) {
      match = false;
      break;
    }
  }

  return match;
}

/*!
 * Extension to `iterableEqual` specifically
 * for Node.js Buffers.
 *
 * @param {Buffer} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function bufferEqual(a, b) {
  if (!Buffer.isBuffer(b)) return false;
  return iterableEqual(a, b);
}

/*!
 * Block for `objectEqual` ensuring non-existing
 * values don't get in.
 *
 * @param {Mixed} object
 * @return {Boolean} result
 */

function isValue(a) {
  return a !== null && a !== undefined;
}

/*!
 * Recursively check the equality of two objects.
 * Once basic sameness has been established it will
 * defer to `deepEqual` for each enumerable key
 * in the object.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function objectEqual(a, b, m) {
  if (!isValue(a) || !isValue(b)) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  var i;
  if (m) {
    for (i = 0; i < m.length; i++) {
      if ((m[i][0] === a && m[i][1] === b)
      ||  (m[i][0] === b && m[i][1] === a)) {
        return true;
      }
    }
  } else {
    m = [];
  }

  try {
    var ka = enumerable(a);
    var kb = enumerable(b);
  } catch (ex) {
    return false;
  }

  ka.sort();
  kb.sort();

  if (!iterableEqual(ka, kb)) {
    return false;
  }

  m.push([ a, b ]);

  var key;
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], m)) {
      return false;
    }
  }

  return true;
}

},{"buffer":38,"type-detect":36}],36:[function(require,module,exports){
module.exports = require('./lib/type');

},{"./lib/type":37}],37:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Array]': 'array'
  , '[object RegExp]': 'regexp'
  , '[object Function]': 'function'
  , '[object Arguments]': 'arguments'
  , '[object Date]': 'date'
};

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */

function getType (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library () {
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function (type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function (obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],38:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  function Foo () {}
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    arr.constructor = Foo
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Foo && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":39,"ieee754":40,"is-array":41}],39:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],40:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],41:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],42:[function(require,module,exports){
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
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
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
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
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
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

},{}],43:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.3.2 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.3.2',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],44:[function(require,module,exports){
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

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],45:[function(require,module,exports){
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

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],46:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":44,"./encode":45}],47:[function(require,module,exports){
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

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":43,"querystring":46}],48:[function(require,module,exports){
;(function (require, exports, module, platform) {

if (module) module.exports = minimatch
else exports.minimatch = minimatch

if (!require) {
  require = function (id) {
    switch (id) {
      case "sigmund": return function sigmund (obj) {
        return JSON.stringify(obj)
      }
      case "path": return { basename: function (f) {
        f = f.split(/[\/\\]/)
        var e = f.pop()
        if (!e) e = f.pop()
        return e
      }}
      case "lru-cache": return function LRUCache () {
        // not quite an LRU, but still space-limited.
        var cache = {}
        var cnt = 0
        this.set = function (k, v) {
          cnt ++
          if (cnt >= 100) cache = {}
          cache[k] = v
        }
        this.get = function (k) { return cache[k] }
      }
    }
  }
}

minimatch.Minimatch = Minimatch

var LRU = require("lru-cache")
  , cache = minimatch.cache = new LRU({max: 100})
  , GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
  , sigmund = require("sigmund")

var path = require("path")
  // any single thing other than /
  // don't need to escape / when using new RegExp()
  , qmark = "[^/]"

  // * => any number of characters
  , star = qmark + "*?"

  // ** when dots are allowed.  Anything goes, except .. and .
  // not (^ or / followed by one or two dots followed by $ or /),
  // followed by anything, any number of times.
  , twoStarDot = "(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?"

  // not a ^ or / followed by a dot,
  // followed by anything, any number of times.
  , twoStarNoDot = "(?:(?!(?:\\\/|^)\\.).)*?"

  // characters that need to be escaped in RegExp.
  , reSpecials = charSet("().*{}+?[]^$\\!")

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split("").reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}


function minimatch (p, pattern, options) {
  if (typeof pattern !== "string") {
    throw new TypeError("glob pattern string required")
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === "") return p === ""

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options, cache)
  }

  if (typeof pattern !== "string") {
    throw new TypeError("glob pattern string required")
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows: need to use /, not \
  // On other platforms, \ is a valid (albeit bad) filename char.
  if (platform === "win32") {
    pattern = pattern.split("\\").join("/")
  }

  // lru storage.
  // these things aren't particularly big, but walking down the string
  // and turning it into a regexp can get pretty costly.
  var cacheKey = pattern + "\n" + sigmund(options)
  var cached = minimatch.cache.get(cacheKey)
  if (cached) return cached
  minimatch.cache.set(cacheKey, this)

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function() {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === "#") {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return -1 === s.indexOf(false)
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
    , negate = false
    , options = this.options
    , negateOffset = 0

  if (options.nonegate) return

  for ( var i = 0, l = pattern.length
      ; i < l && pattern.charAt(i) === "!"
      ; i ++) {
    negate = !negate
    negateOffset ++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return new Minimatch(pattern, options).braceExpand()
}

Minimatch.prototype.braceExpand = braceExpand

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function braceExpand (pattern, options) {
  options = options || this.options
  pattern = typeof pattern === "undefined"
    ? this.pattern : pattern

  if (typeof pattern === "undefined") {
    throw new Error("undefined pattern")
  }

  if (options.nobrace ||
      !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  var escaping = false

  // examples and comments refer to this crazy pattern:
  // a{b,c{d,e},{f,g}h}x{y,z}
  // expected:
  // abxy
  // abxz
  // acdxy
  // acdxz
  // acexy
  // acexz
  // afhxy
  // afhxz
  // aghxy
  // aghxz

  // everything before the first \{ is just a prefix.
  // So, we pluck that off, and work with the rest,
  // and then prepend it to everything we find.
  if (pattern.charAt(0) !== "{") {
    this.debug(pattern)
    var prefix = null
    for (var i = 0, l = pattern.length; i < l; i ++) {
      var c = pattern.charAt(i)
      this.debug(i, c)
      if (c === "\\") {
        escaping = !escaping
      } else if (c === "{" && !escaping) {
        prefix = pattern.substr(0, i)
        break
      }
    }

    // actually no sets, all { were escaped.
    if (prefix === null) {
      this.debug("no sets")
      return [pattern]
    }

   var tail = braceExpand.call(this, pattern.substr(i), options)
    return tail.map(function (t) {
      return prefix + t
    })
  }

  // now we have something like:
  // {b,c{d,e},{f,g}h}x{y,z}
  // walk through the set, expanding each part, until
  // the set ends.  then, we'll expand the suffix.
  // If the set only has a single member, then'll put the {} back

  // first, handle numeric sets, since they're easier
  var numset = pattern.match(/^\{(-?[0-9]+)\.\.(-?[0-9]+)\}/)
  if (numset) {
    this.debug("numset", numset[1], numset[2])
    var suf = braceExpand.call(this, pattern.substr(numset[0].length), options)
      , start = +numset[1]
      , needPadding = numset[1][0] === '0'
      , startWidth = numset[1].length
      , padded
      , end = +numset[2]
      , inc = start > end ? -1 : 1
      , set = []

    for (var i = start; i != (end + inc); i += inc) {
      padded = needPadding ? pad(i, startWidth) : i + ''
      // append all the suffixes
      for (var ii = 0, ll = suf.length; ii < ll; ii ++) {
        set.push(padded + suf[ii])
      }
    }
    return set
  }

  // ok, walk through the set
  // We hope, somewhat optimistically, that there
  // will be a } at the end.
  // If the closing brace isn't found, then the pattern is
  // interpreted as braceExpand("\\" + pattern) so that
  // the leading \{ will be interpreted literally.
  var i = 1 // skip the \{
    , depth = 1
    , set = []
    , member = ""
    , sawEnd = false
    , escaping = false

  function addMember () {
    set.push(member)
    member = ""
  }

  this.debug("Entering for")
  FOR: for (i = 1, l = pattern.length; i < l; i ++) {
    var c = pattern.charAt(i)
    this.debug("", i, c)

    if (escaping) {
      escaping = false
      member += "\\" + c
    } else {
      switch (c) {
        case "\\":
          escaping = true
          continue

        case "{":
          depth ++
          member += "{"
          continue

        case "}":
          depth --
          // if this closes the actual set, then we're done
          if (depth === 0) {
            addMember()
            // pluck off the close-brace
            i ++
            break FOR
          } else {
            member += c
            continue
          }

        case ",":
          if (depth === 1) {
            addMember()
          } else {
            member += c
          }
          continue

        default:
          member += c
          continue
      } // switch
    } // else
  } // for

  // now we've either finished the set, and the suffix is
  // pattern.substr(i), or we have *not* closed the set,
  // and need to escape the leading brace
  if (depth !== 0) {
    this.debug("didn't close", pattern)
    return braceExpand.call(this, "\\" + pattern, options)
  }

  // x{y,z} -> ["xy", "xz"]
  this.debug("set", set)
  this.debug("suffix", pattern.substr(i))
  var suf = braceExpand.call(this, pattern.substr(i), options)
  // ["b", "c{d,e}","{f,g}h"] ->
  //   [["b"], ["cd", "ce"], ["fh", "gh"]]
  var addBraces = set.length === 1
  this.debug("set pre-expanded", set)
  set = set.map(function (p) {
    return braceExpand.call(this, p, options)
  }, this)
  this.debug("set expanded", set)


  // [["b"], ["cd", "ce"], ["fh", "gh"]] ->
  //   ["b", "cd", "ce", "fh", "gh"]
  set = set.reduce(function (l, r) {
    return l.concat(r)
  })

  if (addBraces) {
    set = set.map(function (s) {
      return "{" + s + "}"
    })
  }

  // now attach the suffixes.
  var ret = []
  for (var i = 0, l = set.length; i < l; i ++) {
    for (var ii = 0, ll = suf.length; ii < ll; ii ++) {
      ret.push(set[i] + suf[ii])
    }
  }
  return ret
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === "**") return GLOBSTAR
  if (pattern === "") return ""

  var re = ""
    , hasMagic = !!options.nocase
    , escaping = false
    // ? => one single character
    , patternListStack = []
    , plType
    , stateChar
    , inClass = false
    , reClassStart = -1
    , classStart = -1
    // . and .. never match anything that doesn't start with .,
    // even when options.dot is set.
    , patternStart = pattern.charAt(0) === "." ? "" // anything
      // not (start or / followed by . or .. followed by / or end)
      : options.dot ? "(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))"
      : "(?!\\.)"
    , self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case "*":
          re += star
          hasMagic = true
          break
        case "?":
          re += qmark
          hasMagic = true
          break
        default:
          re += "\\"+stateChar
          break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for ( var i = 0, len = pattern.length, c
      ; (i < len) && (c = pattern.charAt(i))
      ; i ++ ) {

    this.debug("%s\t%s %s %j", pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += "\\" + c
      escaping = false
      continue
    }

    SWITCH: switch (c) {
      case "/":
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case "\\":
        clearStateChar()
        escaping = true
        continue

      // the various stateChar values
      // for the "extglob" stuff.
      case "?":
      case "*":
      case "+":
      case "@":
      case "!":
        this.debug("%s\t%s %s %j <-- stateChar", pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === "!" && i === classStart + 1) c = "^"
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
        continue

      case "(":
        if (inClass) {
          re += "("
          continue
        }

        if (!stateChar) {
          re += "\\("
          continue
        }

        plType = stateChar
        patternListStack.push({ type: plType
                              , start: i - 1
                              , reStart: re.length })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === "!" ? "(?:(?!" : "(?:"
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
        continue

      case ")":
        if (inClass || !patternListStack.length) {
          re += "\\)"
          continue
        }

        clearStateChar()
        hasMagic = true
        re += ")"
        plType = patternListStack.pop().type
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        switch (plType) {
          case "!":
            re += "[^/]*?)"
            break
          case "?":
          case "+":
          case "*": re += plType
          case "@": break // the default anyway
        }
        continue

      case "|":
        if (inClass || !patternListStack.length || escaping) {
          re += "\\|"
          escaping = false
          continue
        }

        clearStateChar()
        re += "|"
        continue

      // these are mostly the same in regexp and glob
      case "[":
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += "\\" + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
        continue

      case "]":
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += "\\" + c
          escaping = false
          continue
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
        continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
                   && !(c === "^" && inClass)) {
          re += "\\"
        }

        re += c

    } // switch
  } // for


  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    var cs = pattern.substr(classStart + 1)
      , sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + "\\[" + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  var pl
  while (pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + 3)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = "\\"
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + "|"
    })

    this.debug("tail=%j\n   %s", tail, tail)
    var t = pl.type === "*" ? star
          : pl.type === "?" ? qmark
          : "\\" + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart)
       + t + "\\("
       + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += "\\\\"
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case ".":
    case "[":
    case "(": addPatternStart = true
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== "" && hasMagic) re = "(?=.)" + re

  if (addPatternStart) re = patternStart + re

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [ re, hasMagic ]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? "i" : ""
    , regExp = new RegExp("^" + re + "$", flags)

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) return this.regexp = false
  var options = this.options

  var twoStar = options.noglobstar ? star
      : options.dot ? twoStarDot
      : twoStarNoDot
    , flags = options.nocase ? "i" : ""

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
           : (typeof p === "string") ? regExpEscape(p)
           : p._src
    }).join("\\\/")
  }).join("|")

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = "^(?:" + re + ")$"

  // can match anything, as long as it's not this.
  if (this.negate) re = "^(?!" + re + ").*$"

  try {
    return this.regexp = new RegExp(re, flags)
  } catch (ex) {
    return this.regexp = false
  }
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug("match", f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ""

  if (f === "/" && partial) return true

  var options = this.options

  // windows: need to use /, not \
  // On other platforms, \ is a valid (albeit bad) filename char.
  if (platform === "win32") {
    f = f.split("\\").join("/")
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, "split", f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, "set", set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename;
  for (var i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (var i = 0, l = set.length; i < l; i ++) {
    var pattern = set[i], file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug("matchOne",
              { "this": this
              , file: file
              , pattern: pattern })

  this.debug("matchOne", file.length, pattern.length)

  for ( var fi = 0
          , pi = 0
          , fl = file.length
          , pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi ++, pi ++ ) {

    this.debug("matchOne loop")
    var p = pattern[pi]
      , f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
        , pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for ( ; fi < fl; fi ++) {
          if (file[fi] === "." || file[fi] === ".." ||
              (!options.dot && file[fi].charAt(0) === ".")) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      WHILE: while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while',
                    file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === "." || swallowee === ".." ||
              (!options.dot && swallowee.charAt(0) === ".")) {
            this.debug("dot detected!", file, fr, pattern, pr)
            break WHILE
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr ++
        }
      }
      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug("\n>>> no match, partial?", file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === "string") {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug("string match", p, f, hit)
    } else {
      hit = f.match(p)
      this.debug("pattern match", p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === "")
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error("wtf?")
}


// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, "$1")
}


function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
}

})( typeof require === "function" ? require : null,
    this,
    typeof module === "object" ? module : null,
    typeof process === "object" ? process.platform : "win32"
  )

},{"lru-cache":49,"path":42,"sigmund":50}],49:[function(require,module,exports){
;(function () { // closure for web browsers

if (typeof module === 'object' && module.exports) {
  module.exports = LRUCache
} else {
  // just set the global for non-node platforms.
  this.LRUCache = LRUCache
}

function hOP (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function naiveLength () { return 1 }

function LRUCache (options) {
  if (!(this instanceof LRUCache))
    return new LRUCache(options)

  if (typeof options === 'number')
    options = { max: options }

  if (!options)
    options = {}

  this._max = options.max
  // Kind of weird to have a default max of Infinity, but oh well.
  if (!this._max || !(typeof this._max === "number") || this._max <= 0 )
    this._max = Infinity

  this._lengthCalculator = options.length || naiveLength
  if (typeof this._lengthCalculator !== "function")
    this._lengthCalculator = naiveLength

  this._allowStale = options.stale || false
  this._maxAge = options.maxAge || null
  this._dispose = options.dispose
  this.reset()
}

// resize the cache when the max changes.
Object.defineProperty(LRUCache.prototype, "max",
  { set : function (mL) {
      if (!mL || !(typeof mL === "number") || mL <= 0 ) mL = Infinity
      this._max = mL
      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._max }
  , enumerable : true
  })

// resize the cache when the lengthCalculator changes.
Object.defineProperty(LRUCache.prototype, "lengthCalculator",
  { set : function (lC) {
      if (typeof lC !== "function") {
        this._lengthCalculator = naiveLength
        this._length = this._itemCount
        for (var key in this._cache) {
          this._cache[key].length = 1
        }
      } else {
        this._lengthCalculator = lC
        this._length = 0
        for (var key in this._cache) {
          this._cache[key].length = this._lengthCalculator(this._cache[key].value)
          this._length += this._cache[key].length
        }
      }

      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._lengthCalculator }
  , enumerable : true
  })

Object.defineProperty(LRUCache.prototype, "length",
  { get : function () { return this._length }
  , enumerable : true
  })


Object.defineProperty(LRUCache.prototype, "itemCount",
  { get : function () { return this._itemCount }
  , enumerable : true
  })

LRUCache.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  var i = 0
  var itemCount = this._itemCount

  for (var k = this._mru - 1; k >= 0 && i < itemCount; k--) if (this._lruList[k]) {
    i++
    var hit = this._lruList[k]
    if (isStale(this, hit)) {
      del(this, hit)
      if (!this._allowStale) hit = undefined
    }
    if (hit) {
      fn.call(thisp, hit.value, hit.key, this)
    }
  }
}

LRUCache.prototype.keys = function () {
  var keys = new Array(this._itemCount)
  var i = 0
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    keys[i++] = hit.key
  }
  return keys
}

LRUCache.prototype.values = function () {
  var values = new Array(this._itemCount)
  var i = 0
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    values[i++] = hit.value
  }
  return values
}

LRUCache.prototype.reset = function () {
  if (this._dispose && this._cache) {
    for (var k in this._cache) {
      this._dispose(k, this._cache[k].value)
    }
  }

  this._cache = Object.create(null) // hash of items by key
  this._lruList = Object.create(null) // list of items in order of use recency
  this._mru = 0 // most recently used
  this._lru = 0 // least recently used
  this._length = 0 // number of items in the list
  this._itemCount = 0
}

// Provided for debugging/dev purposes only. No promises whatsoever that
// this API stays stable.
LRUCache.prototype.dump = function () {
  return this._cache
}

LRUCache.prototype.dumpLru = function () {
  return this._lruList
}

LRUCache.prototype.set = function (key, value, maxAge) {
  maxAge = maxAge || this._maxAge
  var now = maxAge ? Date.now() : 0

  if (hOP(this._cache, key)) {
    // dispose of the old one before overwriting
    if (this._dispose)
      this._dispose(key, this._cache[key].value)

    this._cache[key].now = now
    this._cache[key].maxAge = maxAge
    this._cache[key].value = value
    this.get(key)
    return true
  }

  var len = this._lengthCalculator(value)
  var hit = new Entry(key, value, this._mru++, len, now, maxAge)

  // oversized objects fall out of cache automatically.
  if (hit.length > this._max) {
    if (this._dispose) this._dispose(key, value)
    return false
  }

  this._length += hit.length
  this._lruList[hit.lu] = this._cache[key] = hit
  this._itemCount ++

  if (this._length > this._max)
    trim(this)

  return true
}

LRUCache.prototype.has = function (key) {
  if (!hOP(this._cache, key)) return false
  var hit = this._cache[key]
  if (isStale(this, hit)) {
    return false
  }
  return true
}

LRUCache.prototype.get = function (key) {
  return get(this, key, true)
}

LRUCache.prototype.peek = function (key) {
  return get(this, key, false)
}

LRUCache.prototype.pop = function () {
  var hit = this._lruList[this._lru]
  del(this, hit)
  return hit || null
}

LRUCache.prototype.del = function (key) {
  del(this, this._cache[key])
}

function get (self, key, doUse) {
  var hit = self._cache[key]
  if (hit) {
    if (isStale(self, hit)) {
      del(self, hit)
      if (!self._allowStale) hit = undefined
    } else {
      if (doUse) use(self, hit)
    }
    if (hit) hit = hit.value
  }
  return hit
}

function isStale(self, hit) {
  if (!hit || (!hit.maxAge && !self._maxAge)) return false
  var stale = false;
  var diff = Date.now() - hit.now
  if (hit.maxAge) {
    stale = diff > hit.maxAge
  } else {
    stale = self._maxAge && (diff > self._maxAge)
  }
  return stale;
}

function use (self, hit) {
  shiftLU(self, hit)
  hit.lu = self._mru ++
  self._lruList[hit.lu] = hit
}

function trim (self) {
  while (self._lru < self._mru && self._length > self._max)
    del(self, self._lruList[self._lru])
}

function shiftLU (self, hit) {
  delete self._lruList[ hit.lu ]
  while (self._lru < self._mru && !self._lruList[self._lru]) self._lru ++
}

function del (self, hit) {
  if (hit) {
    if (self._dispose) self._dispose(hit.key, hit.value)
    self._length -= hit.length
    self._itemCount --
    delete self._cache[ hit.key ]
    shiftLU(self, hit)
  }
}

// classy, since V8 prefers predictable objects.
function Entry (key, value, lu, length, now, maxAge) {
  this.key = key
  this.value = value
  this.lu = lu
  this.length = length
  this.now = now
  if (maxAge) this.maxAge = maxAge
}

})()

},{}],50:[function(require,module,exports){
module.exports = sigmund
function sigmund (subject, maxSessions) {
    maxSessions = maxSessions || 10;
    var notes = [];
    var analysis = '';
    var RE = RegExp;

    function psychoAnalyze (subject, session) {
        if (session > maxSessions) return;

        if (typeof subject === 'function' ||
            typeof subject === 'undefined') {
            return;
        }

        if (typeof subject !== 'object' || !subject ||
            (subject instanceof RE)) {
            analysis += subject;
            return;
        }

        if (notes.indexOf(subject) !== -1 || session === maxSessions) return;

        notes.push(subject);
        analysis += '{';
        Object.keys(subject).forEach(function (issue, _, __) {
            // pseudo-private values.  skip those.
            if (issue.charAt(0) === '_') return;
            var to = typeof subject[issue];
            if (to === 'function' || to === 'undefined') return;
            analysis += issue;
            psychoAnalyze(subject[issue], session + 1);
        });
    }
    psychoAnalyze(subject, 0);
    return analysis;
}

// vim: set softtabstop=4 shiftwidth=4:

},{}],51:[function(require,module,exports){
(function (Buffer){
function FilerBuffer (subject, encoding, nonZero) {

  // Automatically turn ArrayBuffer into Uint8Array so that underlying
  // Buffer code doesn't just throw away and ignore ArrayBuffer data.
  if (subject instanceof ArrayBuffer) {
    subject = new Uint8Array(subject);
  }

  return new Buffer(subject, encoding, nonZero);
};

// Inherit prototype from Buffer
FilerBuffer.prototype = Object.create(Buffer.prototype);
FilerBuffer.prototype.constructor = FilerBuffer;

// Also copy static methods onto FilerBuffer ctor
Object.keys(Buffer).forEach(function (p) {
  if (Buffer.hasOwnProperty(p)) {
    FilerBuffer[p] = Buffer[p];
  }
});

module.exports = FilerBuffer;

}).call(this,require("buffer").Buffer)
},{"buffer":38}],52:[function(require,module,exports){
var O_READ = 'READ';
var O_WRITE = 'WRITE';
var O_CREATE = 'CREATE';
var O_EXCLUSIVE = 'EXCLUSIVE';
var O_TRUNCATE = 'TRUNCATE';
var O_APPEND = 'APPEND';
var XATTR_CREATE = 'CREATE';
var XATTR_REPLACE = 'REPLACE';

module.exports = {
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
  FS_NODUPEIDCHECK: 'FS_NODUPEIDCHECK',

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

  // Reserved File Descriptors for streams
  STDIN: 0,
  STDOUT: 1,
  STDERR: 2,
  FIRST_DESCRIPTOR: 3,

  ENVIRONMENT: {
    TMP: '/tmp',
    PATH: ''
  }
};

},{}],53:[function(require,module,exports){
var MODE_FILE = require('./constants.js').MODE_FILE;

module.exports = function DirectoryEntry(id, type) {
  this.id = id;
  this.type = type || MODE_FILE;
};

},{"./constants.js":52}],54:[function(require,module,exports){
(function (Buffer){
// Adapt encodings to work with Buffer or Uint8Array, they expect the latter
function decode(buf) {
  return buf.toString('utf8');
}

function encode(string) {
  return new Buffer(string, 'utf8');
}

module.exports = {
  encode: encode,
  decode: decode
};

}).call(this,require("buffer").Buffer)
},{"buffer":38}],55:[function(require,module,exports){
var errors = {};
[
  /**
   * node.js errors - we only use some of these, add as needed.
   */
  //'-1:UNKNOWN:unknown error',
  //'0:OK:success',
  //'1:EOF:end of file',
  //'2:EADDRINFO:getaddrinfo error',
  //'3:EACCES:permission denied',
  //'4:EAGAIN:resource temporarily unavailable',
  //'5:EADDRINUSE:address already in use',
  //'6:EADDRNOTAVAIL:address not available',
  //'7:EAFNOSUPPORT:address family not supported',
  //'8:EALREADY:connection already in progress',
  '9:EBADF:bad file descriptor',
  '10:EBUSY:resource busy or locked',
  //'11:ECONNABORTED:software caused connection abort',
  //'12:ECONNREFUSED:connection refused',
  //'13:ECONNRESET:connection reset by peer',
  //'14:EDESTADDRREQ:destination address required',
  //'15:EFAULT:bad address in system call argument',
  //'16:EHOSTUNREACH:host is unreachable',
  //'17:EINTR:interrupted system call',
  '18:EINVAL:invalid argument',
  //'19:EISCONN:socket is already connected',
  //'20:EMFILE:too many open files',
  //'21:EMSGSIZE:message too long',
  //'22:ENETDOWN:network is down',
  //'23:ENETUNREACH:network is unreachable',
  //'24:ENFILE:file table overflow',
  //'25:ENOBUFS:no buffer space available',
  //'26:ENOMEM:not enough memory',
  '27:ENOTDIR:not a directory',
  '28:EISDIR:illegal operation on a directory',
  //'29:ENONET:machine is not on the network',
  // errno 30 skipped, as per https://github.com/rvagg/node-errno/blob/master/errno.js
  //'31:ENOTCONN:socket is not connected',
  //'32:ENOTSOCK:socket operation on non-socket',
  //'33:ENOTSUP:operation not supported on socket',
  '34:ENOENT:no such file or directory',
  //'35:ENOSYS:function not implemented',
  //'36:EPIPE:broken pipe',
  //'37:EPROTO:protocol error',
  //'38:EPROTONOSUPPORT:protocol not supported',
  //'39:EPROTOTYPE:protocol wrong type for socket',
  //'40:ETIMEDOUT:connection timed out',
  //'41:ECHARSET:invalid Unicode character',
  //'42:EAIFAMNOSUPPORT:address family for hostname not supported',
  // errno 43 skipped, as per https://github.com/rvagg/node-errno/blob/master/errno.js
  //'44:EAISERVICE:servname not supported for ai_socktype',
  //'45:EAISOCKTYPE:ai_socktype not supported',
  //'46:ESHUTDOWN:cannot send after transport endpoint shutdown',
  '47:EEXIST:file already exists',
  //'48:ESRCH:no such process',
  //'49:ENAMETOOLONG:name too long',
  '50:EPERM:operation not permitted',
  '51:ELOOP:too many symbolic links encountered',
  //'52:EXDEV:cross-device link not permitted',
  '53:ENOTEMPTY:directory not empty',
  //'54:ENOSPC:no space left on device',
  '55:EIO:i/o error',
  //'56:EROFS:read-only file system',
  //'57:ENODEV:no such device',
  //'58:ESPIPE:invalid seek',
  //'59:ECANCELED:operation canceled',

  /**
   * Filer specific errors
   */
  '1000:ENOTMOUNTED:not mounted',
  '1001:EFILESYSTEMERROR:missing super node, use \'FORMAT\' flag to format filesystem.',
  '1002:ENOATTR:attribute does not exist'

].forEach(function(e) {
  e = e.split(':');
  var errno = +e[0];
  var errName = e[1];
  var defaultMessage = e[2];

  function FilerError(msg, path) {
    Error.call(this);

    this.name = errName;
    this.code = errName;
    this.errno = errno;
    this.message = msg || defaultMessage;
    if(path) {
      this.path = path;
    }
    this.stack = (new Error(this.message)).stack;
  }
  FilerError.prototype = Object.create(Error.prototype);
  FilerError.prototype.constructor = FilerError;
  FilerError.prototype.toString = function() {
    var pathInfo = this.path ? (', \'' + this.path + '\'') : '';
    return this.name + ': ' + this.message + pathInfo;
  };

  // We expose the error as both Errors.EINVAL and Errors[18]
  errors[errName] = errors[errno] = FilerError;
});

module.exports = errors;

},{}],56:[function(require,module,exports){
var _ = require('../../lib/nodash.js');

var Path = require('../path.js');
var normalize = Path.normalize;
var dirname = Path.dirname;
var basename = Path.basename;
var isAbsolutePath = Path.isAbsolute;
var isNullPath = Path.isNull;

var Constants = require('../constants.js');
var MODE_FILE = Constants.MODE_FILE;
var MODE_DIRECTORY = Constants.MODE_DIRECTORY;
var MODE_SYMBOLIC_LINK = Constants.MODE_SYMBOLIC_LINK;
var MODE_META = Constants.MODE_META;

var ROOT_DIRECTORY_NAME = Constants.ROOT_DIRECTORY_NAME;
var SUPER_NODE_ID = Constants.SUPER_NODE_ID;
var SYMLOOP_MAX = Constants.SYMLOOP_MAX;

var O_READ = Constants.O_READ;
var O_WRITE = Constants.O_WRITE;
var O_CREATE = Constants.O_CREATE;
var O_EXCLUSIVE = Constants.O_EXCLUSIVE;
var O_TRUNCATE = Constants.O_TRUNCATE;
var O_APPEND = Constants.O_APPEND;
var O_FLAGS = Constants.O_FLAGS;

var XATTR_CREATE = Constants.XATTR_CREATE;
var XATTR_REPLACE = Constants.XATTR_REPLACE;
var FS_NOMTIME = Constants.FS_NOMTIME;
var FS_NOCTIME = Constants.FS_NOCTIME;

var Encoding = require('../encoding.js');
var Errors = require('../errors.js');
var DirectoryEntry = require('../directory-entry.js');
var OpenFileDescription = require('../open-file-description.js');
var SuperNode = require('../super-node.js');
var Node = require('../node.js');
var Stats = require('../stats.js');
var Buffer = require('../buffer.js');

/**
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
    context.putObject(node.id, node, complete);
  } else {
    complete();
  }
}

/**
 * make_node()
 */
// in: file or directory path
// out: new node representing file/directory
function make_node(context, path, mode, callback) {
  if(mode !== MODE_DIRECTORY && mode !== MODE_FILE) {
    return callback(new Errors.EINVAL('mode must be a directory or file', path));
  }

  path = normalize(path);

  var name = basename(path);
  var parentPath = dirname(path);
  var parentNode;
  var parentNodeData;
  var node;

  // Check if the parent node exists
  function create_node_in_parent(error, parentDirectoryNode) {
    if(error) {
      callback(error);
    } else if(parentDirectoryNode.mode !== MODE_DIRECTORY) {
      callback(new Errors.ENOTDIR('a component of the path prefix is not a directory', path));
    } else {
      parentNode = parentDirectoryNode;
      find_node(context, path, check_if_node_exists);
    }
  }

  // Check if the node to be created already exists
  function check_if_node_exists(error, result) {
    if(!error && result) {
      callback(new Errors.EEXIST('path name already exists', path));
    } else if(error && !(error instanceof Errors.ENOENT)) {
      callback(error);
    } else {
      context.getObject(parentNode.data, create_node);
    }
  }

  // Create the new node
  function create_node(error, result) {
    if(error) {
      callback(error);
    } else {
      parentNodeData = result;
      Node.create({guid: context.guid, mode: mode}, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        node = result;
        node.nlinks += 1;
        context.putObject(node.id, node, update_parent_node_data);
      });
    }
  }

  // Update parent node time
  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, parentPath, node, { mtime: now, ctime: now }, callback);
    }
  }

  // Update the parent nodes data
  function update_parent_node_data(error) {
    if(error) {
      callback(error);
    } else {
      parentNodeData[name] = new DirectoryEntry(node.id, mode);
      context.putObject(parentNode.data, parentNodeData, update_time);
    }
  }

  // Find the parent node
  find_node(context, parentPath, create_node_in_parent);
}

/**
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
      context.getObject(superNode.rnode, check_root_directory_node);
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
      callback(new Errors.ENOTDIR('a component of the path prefix is not a directory', path));
    } else {
      context.getObject(parentDirectoryNode.data, get_node_from_parent_directory_data);
    }
  }

  // in: parent directory data
  // out: searched node
  function get_node_from_parent_directory_data(error, parentDirectoryData) {
    if(error) {
      callback(error);
    } else {
      if(!_(parentDirectoryData).has(name)) {
        callback(new Errors.ENOENT(null, path));
      } else {
        var nodeId = parentDirectoryData[name].id;
        context.getObject(nodeId, is_symbolic_link);
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
          callback(new Errors.ELOOP(null, path));
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
      context.getObject(SUPER_NODE_ID, read_root_directory_node);
    } else {
      find_node(context, parentPath, read_parent_directory_data);
    }
  }

  if(ROOT_DIRECTORY_NAME == name) {
    context.getObject(SUPER_NODE_ID, read_root_directory_node);
  } else {
    find_node(context, parentPath, read_parent_directory_data);
  }
}


/**
 * set extended attribute (refactor)
 */
function set_extended_attribute (context, path, node, name, value, flag, callback) {
  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      update_node_times(context, path, node, { ctime: Date.now() }, callback);
    }
  }

  var xattrs = node.xattrs;

  if (flag === XATTR_CREATE && xattrs.hasOwnProperty(name)) {
    callback(new Errors.EEXIST('attribute already exists', path));
  }
  else if (flag === XATTR_REPLACE && !xattrs.hasOwnProperty(name)) {
    callback(new Errors.ENOATTR(null, path));
  }
  else {
    xattrs[name] = value;
    context.putObject(node.id, node, update_time);
  }
}

/**
 * ensure_root_directory. Creates a root node if necessary.
 *
 * Note: this should only be invoked when formatting a new file system.
 * Multiple invocations of this by separate instances will still result
 * in only a single super node.
 */
function ensure_root_directory(context, callback) {
  var superNode;
  var directoryNode;
  var directoryData;

  function ensure_super_node(error, existingNode) {
    if(!error && existingNode) {
      // Another instance has beat us and already created the super node.
      callback();
    } else if(error && !(error instanceof Errors.ENOENT)) {
      callback(error);
    } else {
      SuperNode.create({guid: context.guid}, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        superNode = result;
        context.putObject(superNode.id, superNode, write_directory_node);
      });
    }
  }

  function write_directory_node(error) {
    if(error) {
      callback(error);
    } else {
      Node.create({guid: context.guid, id: superNode.rnode, mode: MODE_DIRECTORY}, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        directoryNode = result;
        directoryNode.nlinks += 1;
        context.putObject(directoryNode.id, directoryNode, write_directory_data);
      });
    }
  }

  function write_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      directoryData = {};
      context.putObject(directoryNode.data, directoryData, callback);
    }
  }

  context.getObject(SUPER_NODE_ID, ensure_super_node);
}

/**
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
      callback(new Errors.EEXIST(null, path));
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
      context.getObject(parentDirectoryNode.data, write_directory_node);
    }
  }

  function write_directory_node(error, result) {
    if(error) {
      callback(error);
    } else {
      parentDirectoryData = result;
      Node.create({guid: context.guid, mode: MODE_DIRECTORY}, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        directoryNode = result;
        directoryNode.nlinks += 1;
        context.putObject(directoryNode.id, directoryNode, write_directory_data);
      });
    }
  }

  function write_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      directoryData = {};
      context.putObject(directoryNode.data, directoryData, update_parent_directory_data);
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
      context.putObject(parentDirectoryNode.data, parentDirectoryData, update_time);
    }
  }

  find_node(context, path, check_if_directory_exists);
}

/**
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
      context.getObject(parentDirectoryNode.data, check_if_node_exists);
    }
  }

  function check_if_node_exists(error, result) {
    if(error) {
      callback(error);
    } else if(ROOT_DIRECTORY_NAME == name) {
      callback(new Errors.EBUSY(null, path));
    } else if(!_(result).has(name)) {
      callback(new Errors.ENOENT(null, path));
    } else {
      parentDirectoryData = result;
      directoryNode = parentDirectoryData[name].id;
      context.getObject(directoryNode, check_if_node_is_directory);
    }
  }

  function check_if_node_is_directory(error, result) {
    if(error) {
      callback(error);
    } else if(result.mode != MODE_DIRECTORY) {
      callback(new Errors.ENOTDIR(null, path));
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_directory_is_empty);
    }
  }

  function check_if_directory_is_empty(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(_(directoryData).size() > 0) {
        callback(new Errors.ENOTEMPTY(null, path));
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
    context.putObject(parentDirectoryNode.data, parentDirectoryData, update_time);
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
      callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set', path));
    } else {
      find_node(context, path, set_file_node);
    }
  } else {
    find_node(context, parentPath, read_directory_data);
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else if(result.mode !== MODE_DIRECTORY) {
      callback(new Errors.ENOENT(null, path));
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(_(directoryData).has(name)) {
        if(_(flags).contains(O_EXCLUSIVE)) {
          callback(new Errors.ENOENT('O_CREATE and O_EXCLUSIVE are set, and the named file exists', path));
        } else {
          directoryEntry = directoryData[name];
          if(directoryEntry.type == MODE_DIRECTORY && _(flags).contains(O_WRITE)) {
            callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set', path));
          } else {
            context.getObject(directoryEntry.id, check_if_symbolic_link);
          }
        }
      } else {
        if(!_(flags).contains(O_CREATE)) {
          callback(new Errors.ENOENT('O_CREATE is not set and the named file does not exist', path));
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
          callback(new Errors.ELOOP(null, path));
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
        callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set', path));
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
    Node.create({guid: context.guid, mode: MODE_FILE}, function(error, result) {
      if(error) {
        callback(error);
        return;
      }
      fileNode = result;
      fileNode.nlinks += 1;
      context.putObject(fileNode.id, fileNode, write_file_data);
    });
  }

  function write_file_data(error) {
    if(error) {
      callback(error);
    } else {
      fileData = new Buffer(0);
      fileData.fill(0);
      context.putBuffer(fileNode.data, fileData, update_directory_data);
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
      context.putObject(directoryNode.data, directoryData, update_time);
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
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  function write_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      var newData = new Buffer(length);
      newData.fill(0);
      buffer.copy(newData, 0, offset, offset + length);
      ofd.position = length;

      fileNode.size = length;
      fileNode.version += 1;

      context.putBuffer(fileNode.data, newData, update_file_node);
    }
  }

  context.getObject(ofd.id, write_file_data);
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
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  function update_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileData = result;
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      var _position = (!(undefined === position || null === position)) ? position : ofd.position;
      var newSize = Math.max(fileData.length, _position + length);
      var newData = new Buffer(newSize);
      newData.fill(0);
      if(fileData) {
        fileData.copy(newData);
      }
      buffer.copy(newData, _position, offset, offset + length);
      if(undefined === position) {
        ofd.position += length;
      }

      fileNode.size = newSize;
      fileNode.version += 1;

      context.putBuffer(fileNode.data, newData, update_file_node);
    }
  }

  function read_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      context.getBuffer(fileNode.data, update_file_data);
    }
  }

  context.getObject(ofd.id, read_file_data);
}

function read_data(context, ofd, buffer, offset, length, position, callback) {
  var fileNode;
  var fileData;

  function handle_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileData = result;
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      var _position = (!(undefined === position || null === position)) ? position : ofd.position;
      length = (_position + length > buffer.length) ? length - _position : length;
      fileData.copy(buffer, offset, _position, _position + length);
      if(undefined === position) {
        ofd.position += length;
      }
      callback(null, length);
    }
  }

  function read_file_data(error, result) {
    if(error) {
      callback(error);
    } else if(result.mode === 'DIRECTORY') {
      callback(new Errors.EISDIR('the named file is a directory', ofd.path));
    } else {
      fileNode = result;
      context.getBuffer(fileNode.data, handle_file_data);
    }
  }

  context.getObject(ofd.id, read_file_data);
}

function stat_file(context, path, callback) {
  path = normalize(path);
  var name = basename(path);
  find_node(context, path, callback);
}

function fstat_file(context, ofd, callback) {
  ofd.getNode(context, callback);
}

function lstat_file(context, path, callback) {
  path = normalize(path);
  var name = basename(path);
  var parentPath = dirname(path);

  var directoryNode;
  var directoryData;

  if(ROOT_DIRECTORY_NAME == name) {
    find_node(context, path, callback);
  } else {
    find_node(context, parentPath, read_directory_data);
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!_(directoryData).has(name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file', path));
      } else {
        context.getObject(directoryData[name].id, callback);
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
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  function read_directory_entry(error, result) {
    if(error) {
      callback(error);
    } else {
      context.getObject(newDirectoryData[newname].id, update_file_node);
    }
  }

  function check_if_new_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      newDirectoryData = result;
      if(_(newDirectoryData).has(newname)) {
        callback(new Errors.EEXIST('newpath resolves to an existing file', newname));
      } else {
        newDirectoryData[newname] = oldDirectoryData[oldname];
        context.putObject(newDirectoryNode.data, newDirectoryData, read_directory_entry);
      }
    }
  }

  function read_new_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      newDirectoryNode = result;
      context.getObject(newDirectoryNode.data, check_if_new_file_exists);
    }
  }

  function check_if_old_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      oldDirectoryData = result;
      if(!_(oldDirectoryData).has(oldname)) {
        callback(new Errors.ENOENT('a component of either path prefix does not exist', oldname));
      } else if(oldDirectoryData[oldname].type === 'DIRECTORY') {
        callback(new Errors.EPERM('oldpath refers to a directory'));
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
      context.getObject(oldDirectoryNode.data, check_if_old_file_exists);
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
      context.putObject(directoryNode.data, directoryData, function(error) {
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
        context.putObject(fileNode.id, fileNode, function(error) {
          update_node_times(context, path, fileNode, { ctime: Date.now() }, update_directory_data);
        });
      }
    }
  }

  function check_if_node_is_directory(error, result) {
    if(error) {
      callback(error);
    } else if(result.mode === 'DIRECTORY') {
      callback(new Errors.EPERM('unlink not permitted on directories', name));
    } else {
      update_file_node(null, result);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!_(directoryData).has(name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file', name));
      } else {
        context.getObject(directoryData[name].id, check_if_node_is_directory);
      }
    }
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
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
    } else if(result.mode !== MODE_DIRECTORY) {
      callback(new Errors.ENOTDIR(null, path));
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, handle_directory_data);
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
    callback(new Errors.EEXIST(null, name));
  } else {
    find_node(context, parentPath, read_directory_data);
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(_(directoryData).has(name)) {
        callback(new Errors.EEXIST(null, name));
      } else {
        write_file_node();
      }
    }
  }

  function write_file_node() {
    Node.create({guid: context.guid, mode: MODE_SYMBOLIC_LINK}, function(error, result) {
      if(error) {
        callback(error);
        return;
      }
      fileNode = result;
      fileNode.nlinks += 1;
      fileNode.size = srcpath.length;
      fileNode.data = srcpath;
      context.putObject(fileNode.id, fileNode, update_directory_data);
    });
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
      context.putObject(directoryNode.data, directoryData, update_time);
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
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!_(directoryData).has(name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file', name));
      } else {
        context.getObject(directoryData[name].id, check_if_symbolic);
      }
    }
  }

  function check_if_symbolic(error, result) {
    if(error) {
      callback(error);
    } else {
      if(result.mode != MODE_SYMBOLIC_LINK) {
        callback(new Errors.EINVAL('path not a symbolic link', path));
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
      callback(new Errors.EISDIR(null, path));
    } else{
      fileNode = node;
      context.getBuffer(fileNode.data, truncate_file_data);
    }
  }

  function truncate_file_data(error, fileData) {
    if (error) {
      callback(error);
    } else {
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      var data = new Buffer(length);
      data.fill(0);
      if(fileData) {
        fileData.copy(data);
      }
      context.putBuffer(fileNode.data, data, update_file_node);
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
      context.putObject(fileNode.id, fileNode, update_time);
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
      context.getBuffer(fileNode.data, truncate_file_data);
    }
  }

  function truncate_file_data(error, fileData) {
    if (error) {
      callback(error);
    } else {
      var data;
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      if(fileData) {
        data = fileData.slice(0, length);
      } else {
        data = new Buffer(length);
        data.fill(0);
      }
      context.putBuffer(fileNode.data, data, update_file_node);
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
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  if(length < 0) {
    callback(new Errors.EINVAL('length cannot be negative'));
  } else {
    ofd.getNode(context, read_file_data);
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
    callback(new Errors.EINVAL('atime and mtime must be number', path));
  }
  else if (atime < 0 || mtime < 0) {
    callback(new Errors.EINVAL('atime and mtime must be positive integers', path));
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
    ofd.getNode(context, update_times);
  }
}

function setxattr_file(context, path, name, value, flag, callback) {
  path = normalize(path);

  function setxattr(error, node) {
    if(error) {
      return callback(error);
    }
    set_extended_attribute(context, path, node, name, value, flag, callback);
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL('attribute name must be a string', path));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string', path));
  }
  else if (flag !== null &&
           flag !== XATTR_CREATE && flag !== XATTR_REPLACE) {
    callback(new Errors.EINVAL('invalid flag, must be null, XATTR_CREATE or XATTR_REPLACE', path));
  }
  else {
    find_node(context, path, setxattr);
  }
}

function fsetxattr_file (context, ofd, name, value, flag, callback) {
  function setxattr(error, node) {
    if(error) {
      return callback(error);
    }
    set_extended_attribute(context, ofd.path, node, name, value, flag, callback);
  }

  if (typeof name !== 'string') {
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
    ofd.getNode(context, setxattr);
  }
}

function getxattr_file (context, path, name, callback) {
  path = normalize(path);

  function get_xattr(error, node) {
    if(error) {
      return callback(error);
    }

    var xattrs = node.xattrs;

    if (!xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR(null, path));
    }
    else {
      callback(null, xattrs[name]);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL('attribute name must be a string', path));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string', path));
  }
  else {
    find_node(context, path, get_xattr);
  }
}

function fgetxattr_file (context, ofd, name, callback) {

  function get_xattr (error, node) {
    if (error) {
      return callback(error);
    }

    var xattrs = node.xattrs;

    if (!xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      callback(null, xattrs[name]);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL());
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    ofd.getNode(context, get_xattr);
  }
}

function removexattr_file (context, path, name, callback) {
  path = normalize(path);

  function remove_xattr (error, node) {
    if (error) {
      return callback(error);
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, path, node, { ctime: Date.now() }, callback);
      }
    }

    var xattrs = node.xattrs;

    if (!xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR(null, path));
    }
    else {
      delete xattrs[name];
      context.putObject(node.id, node, update_time);
    }
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL('attribute name must be a string', path));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string', path));
  }
  else {
    find_node(context, path, remove_xattr);
  }
}

function fremovexattr_file (context, ofd, name, callback) {

  function remove_xattr (error, node) {
    if (error) {
      return callback(error);
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, ofd.path, node, { ctime: Date.now() }, callback);
      }
    }

    var xattrs = node.xattrs;

    if (!xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      delete xattrs[name];
      context.putObject(node.id, node, update_time);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL('attribute name must be a string'));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    ofd.getNode(context, remove_xattr);
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

  if(!path) {
    err = new Errors.EINVAL('Path must be a string', path);
  } else if(isNullPath(path)) {
    err = new Errors.EINVAL('Path must be a string without null bytes.', path);
  } else if(!isAbsolutePath(path)) {
    err = new Errors.EINVAL('Path must be absolute.', path);
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
    callback(new Errors.EINVAL('flags is not valid'), path);
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

function mknod(fs, context, path, mode, callback) {
  if(!pathCheck(path, callback)) return;
  make_node(context, path, mode, callback);
}

function mkdir(fs, context, path, mode, callback) {
  // NOTE: we support passing a mode arg, but we ignore it internally for now.
  callback = arguments[arguments.length - 1];
  if(!pathCheck(path, callback)) return;
  make_directory(context, path, callback);
}

function rmdir(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  remove_directory(context, path, callback);
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
  link_node(context, oldpath, newpath, callback);
}

function unlink(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  unlink_node(context, path, callback);
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
    read_data(context, ofd, buffer, offset, length, position, wrapped_cb);
  }
}

function readFile(fs, context, path, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, null, 'r');

  if(!pathCheck(path, callback)) return;

  var flags = validate_flags(options.flag || 'r');
  if(!flags) {
    return callback(new Errors.EINVAL('flags is not valid', path));
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
    var fd = fs.allocDescriptor(ofd);

    function cleanup() {
      fs.releaseDescriptor(fd);
    }

    fstat_file(context, ofd, function(err, fstatResult) {
      if(err) {
        cleanup();
        return callback(err);
      }

      var stats = new Stats(fstatResult, fs.name);

      if(stats.isDirectory()) {
        cleanup();
        return callback(new Errors.EISDIR('illegal operation on directory', path));
      }

      var size = stats.size;
      var buffer = new Buffer(size);
      buffer.fill(0);

      read_data(context, ofd, buffer, 0, size, 0, function(err, nbytes) {
        cleanup();

        if(err) {
          return callback(err);
        }

        var data;
        if(options.encoding === 'utf8') {
          data = Encoding.decode(buffer);
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
    write_data(context, ofd, buffer, offset, length, position, callback);
  }
}

function writeFile(fs, context, path, data, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, 'utf8', 'w');

  if(!pathCheck(path, callback)) return;

  var flags = validate_flags(options.flag || 'w');
  if(!flags) {
    return callback(new Errors.EINVAL('flags is not valid', path));
  }

  data = data || '';
  if(typeof data === "number") {
    data = '' + data;
  }
  if(typeof data === "string" && options.encoding === 'utf8') {
    data = Encoding.encode(data);
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
    var fd = fs.allocDescriptor(ofd);

    replace_data(context, ofd, data, 0, data.length, function(err, nbytes) {
      fs.releaseDescriptor(fd);

      if(err) {
        return callback(err);
      }
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
    return callback(new Errors.EINVAL('flags is not valid', path));
  }

  data = data || '';
  if(typeof data === "number") {
    data = '' + data;
  }
  if(typeof data === "string" && options.encoding === 'utf8') {
    data = Encoding.encode(data);
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, fileNode.size);
    var fd = fs.allocDescriptor(ofd);

    write_data(context, ofd, data, 0, data.length, ofd.position, function(err, nbytes) {
      fs.releaseDescriptor(fd);

      if(err) {
        return callback(err);
      }
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
  getxattr_file(context, path, name, callback);
}

function fgetxattr(fs, context, fd, name, callback) {
  var ofd = fs.openFiles[fd];
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else {
    fgetxattr_file(context, ofd, name, callback);
  }
}

function setxattr(fs, context, path, name, value, flag, callback) {
  if(typeof flag === 'function') {
    callback = flag;
    flag = null;
  }

  if (!pathCheck(path, callback)) return;
  setxattr_file(context, path, name, value, flag, callback);
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
    fsetxattr_file(context, ofd, name, value, flag, callback);
  }
}

function removexattr(fs, context, path, name, callback) {
  if (!pathCheck(path, callback)) return;
  removexattr_file(context, path, name, callback);
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
    fremovexattr_file(context, ofd, name, callback);
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
  read_directory(context, path, callback);
}

function utimes(fs, context, path, atime, mtime, callback) {
  if(!pathCheck(path, callback)) return;

  var currentTime = Date.now();
  atime = (atime) ? atime : currentTime;
  mtime = (mtime) ? mtime : currentTime;

  utimes_file(context, path, atime, mtime, callback);
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
    futimes_file(context, ofd, atime, mtime, callback);
  }
}

function rename(fs, context, oldpath, newpath, callback) {
  if(!pathCheck(oldpath, callback)) return;
  if(!pathCheck(newpath, callback)) return;

  oldpath = normalize(oldpath);
  newpath = normalize(newpath);

  var oldParentPath = Path.dirname(oldpath);
  var newParentPath = Path.dirname(oldpath);
  var oldName = Path.basename(oldpath);
  var newName = Path.basename(newpath);
  var oldParentDirectory, oldParentData;
  var newParentDirectory, newParentData;

  function update_times(error, newNode) {
    if(error) {
      callback(error);
    } else {
      update_node_times(context, newpath,  newNode, { ctime: Date.now() }, callback);
    }
  }

  function read_new_directory(error) {
    if(error) {
      callback(error);
    } else {
      context.getObject(newParentData[newName].id, update_times);
    }
  }

  function update_old_parent_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      if(oldParentDirectory.id === newParentDirectory.id) {
        oldParentData = newParentData;
      }
      delete oldParentData[oldName];
      context.putObject(oldParentDirectory.data, oldParentData, read_new_directory);
    }
  }

  function update_new_parent_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      newParentData[newName] = oldParentData[oldName];
      context.putObject(newParentDirectory.data, newParentData, update_old_parent_directory_data);
    }
  }

  function check_if_new_directory_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      newParentData = result;
      if(_(newParentData).has(newName)) {
        remove_directory(context, newpath, update_new_parent_directory_data);
      } else {
        update_new_parent_directory_data();
      }
    }
  }

  function read_new_parent_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      newParentDirectory = result;
      context.getObject(newParentDirectory.data, check_if_new_directory_exists);
    }
  }

  function get_new_parent_directory(error, result) {
    if(error) {
      callback(error);
    } else {
      oldParentData = result;
      find_node(context, newParentPath, read_new_parent_directory_data);
    }
  }

  function read_parent_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      oldParentDirectory = result;
      context.getObject(result.data, get_new_parent_directory);
    }
  }

  function unlink_old_file(error) {
    if(error) {
      callback(error);
    } else {
      unlink_node(context, oldpath, callback);
    }
  }

  function check_node_type(error, node) {
    if(error) {
      callback(error);
    } else if(node.mode === 'DIRECTORY') {
      find_node(context, oldParentPath, read_parent_directory_data);
    } else {
      link_node(context, oldpath, newpath, unlink_old_file);
    }
  }

  find_node(context, oldpath, check_node_type);
}

function symlink(fs, context, srcpath, dstpath, type, callback) {
  // NOTE: we support passing the `type` arg, but ignore it.
  callback = arguments[arguments.length - 1];
  if(!pathCheck(srcpath, callback)) return;
  if(!pathCheck(dstpath, callback)) return;
  make_symbolic_link(context, srcpath, dstpath, callback);
}

function readlink(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  read_link(context, path, callback);
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
  truncate_file(context, path, length, callback);
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
    ftruncate_file(context, ofd, length, callback);
  }
}

module.exports = {
  ensureRootDirectory: ensure_root_directory,
  open: open,
  close: close,
  mknod: mknod,
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

},{"../../lib/nodash.js":4,"../buffer.js":51,"../constants.js":52,"../directory-entry.js":53,"../encoding.js":54,"../errors.js":55,"../node.js":60,"../open-file-description.js":61,"../path.js":62,"../stats.js":70,"../super-node.js":71}],57:[function(require,module,exports){
var _ = require('../../lib/nodash.js');

var isNullPath = require('../path.js').isNull;
var nop = require('../shared.js').nop;

var Constants = require('../constants.js');
var FILE_SYSTEM_NAME = Constants.FILE_SYSTEM_NAME;
var FS_FORMAT = Constants.FS_FORMAT;
var FS_READY = Constants.FS_READY;
var FS_PENDING = Constants.FS_PENDING;
var FS_ERROR = Constants.FS_ERROR;
var FS_NODUPEIDCHECK = Constants.FS_NODUPEIDCHECK;

var providers = require('../providers/index.js');

var Shell = require('../shell/shell.js');
var Intercom = require('../../lib/intercom.js');
var FSWatcher = require('../fs-watcher.js');
var Errors = require('../errors.js');
var defaultGuidFn = require('../shared.js').guid;

var STDIN = Constants.STDIN;
var STDOUT = Constants.STDOUT;
var STDERR = Constants.STDERR;
var FIRST_DESCRIPTOR = Constants.FIRST_DESCRIPTOR;

// The core fs operations live on impl
var impl = require('./implementation.js');

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

// Default callback that logs an error if passed in
function defaultCallback(err) {
  if(err) {
    console.error('Filer error: ', err);
  }
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
 * guid: a function for generating unique IDs for nodes in the filesystem.
 *       Use this to override the built-in UUID generation. (Used mainly for tests).
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
  callback = callback || defaultCallback;

  var flags = options.flags;
  var guid = options.guid ? options.guid : defaultGuidFn;
  var provider = options.provider || new providers.Default(options.name || FILE_SYSTEM_NAME);
  // If we're given a provider, match its name unless we get an explicit name
  var name = options.name || provider.name;
  var forceFormatting = _(flags).contains(FS_FORMAT);

  var fs = this;
  fs.readyState = FS_PENDING;
  fs.name = name;
  fs.error = null;

  fs.stdin = STDIN;
  fs.stdout = STDOUT;
  fs.stderr = STDERR;

  // Expose Shell constructor
  this.Shell = Shell.bind(undefined, this);

  // Safely expose the list of open files and file
  // descriptor management functions
  var openFiles = {};
  var nextDescriptor = FIRST_DESCRIPTOR;
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

  // Deal with various approaches to node ID creation
  function wrappedGuidFn(context) {
    return function(callback) {
      // Skip the duplicate ID check if asked to
      if(_(flags).contains(FS_NODUPEIDCHECK)) {
        callback(null, guid());
        return;
      }

      // Otherwise (default) make sure this id is unused first
      function guidWithCheck(callback) {
        var id = guid();
        context.getObject(id, function(err, value) {
          if(err) {
            callback(err);
            return;
          }

          // If this id is unused, use it, otherwise find another
          if(!value) {
            callback(null, id);
          } else {
            guidWithCheck(callback);
          }
        });
      }
      guidWithCheck(callback);
    };
  }

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
  provider.open(function(err) {
    function complete(error) {
      function wrappedContext(methodName) {
        var context = provider[methodName]();
        context.flags = flags;
        context.changes = [];
        context.guid = wrappedGuidFn(context);

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
      }
      runQueued();
      callback(error, fs);
    }

    if(err) {
      return complete(err);
    }

    var context = provider.getReadWriteContext();
    context.guid = wrappedGuidFn(context);

    // Mount the filesystem, formatting if necessary
    if(forceFormatting) {
      // Wipe the storage provider, then write root block
      context.clear(function(err) {
        if(err) {
          return complete(err);
        }
        impl.ensureRootDirectory(context, complete);
      });
    } else {
      // Use existing (or create new) root and mount
      impl.ensureRootDirectory(context, complete);
    }
  });
}

// Expose storage providers on FileSystem constructor
FileSystem.providers = providers;

/**
 * Public API for FileSystem
 */
[
  'open',
  'close',
  'mknod',
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

      // Fail early if the filesystem is in an error state (e.g.,
      // provider failed to open.
      if(FS_ERROR === fs.readyState) {
        var err = new Errors.EFILESYSTEMERROR('filesystem unavailable, operation canceled');
        return callback.call(fs, err);
      }

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

module.exports = FileSystem;

},{"../../lib/intercom.js":3,"../../lib/nodash.js":4,"../constants.js":52,"../errors.js":55,"../fs-watcher.js":58,"../path.js":62,"../providers/index.js":63,"../shared.js":67,"../shell/shell.js":69,"./implementation.js":56}],58:[function(require,module,exports){
var EventEmitter = require('../lib/eventemitter.js');
var Path = require('./path.js');
var Intercom = require('../lib/intercom.js');

/**
 * FSWatcher based on node.js' FSWatcher
 * see https://github.com/joyent/node/blob/master/lib/fs.js
 */
function FSWatcher() {
  EventEmitter.call(this);
  var self = this;
  var recursive = false;
  var recursivePathPrefix;
  var filename;

  function onchange(path) {
    // Watch for exact filename, or parent path when recursive is true.
    if(filename === path || (recursive && path.indexOf(recursivePathPrefix) === 0)) {
      self.trigger('change', 'change', path);
    }
  }

  // We support, but ignore the second arg, which node.js uses.
  self.start = function(filename_, persistent_, recursive_) {
    // Bail if we've already started (and therefore have a filename);
    if(filename) {
      return;
    }

    if(Path.isNull(filename_)) {
      throw new Error('Path must be a string without null bytes.');
    }

    // TODO: get realpath for symlinks on filename...

    // Filer's Path.normalize strips trailing slashes, which we use here.
    // See https://github.com/js-platform/filer/issues/105
    filename = Path.normalize(filename_);

    // Whether to watch beneath this path or not
    recursive = recursive_ === true;
    // If recursive, construct a path prefix portion for comparisons later
    // (i.e., '/path' becomes '/path/' so we can search within a filename for the
    // prefix). We also take care to allow for '/' on its own.
    if(recursive) {
      recursivePathPrefix = filename === '/' ? '/' : filename + '/';
    }

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

module.exports = FSWatcher;

},{"../lib/eventemitter.js":2,"../lib/intercom.js":3,"./path.js":62}],59:[function(require,module,exports){
module.exports = {
  FileSystem: require('./filesystem/interface.js'),
  Buffer: require('./buffer.js'),
  Path: require('./path.js'),
  Errors: require('./errors.js'),
  Shell: require('./shell/shell.js')
};

},{"./buffer.js":51,"./errors.js":55,"./filesystem/interface.js":57,"./path.js":62,"./shell/shell.js":69}],60:[function(require,module,exports){
var MODE_FILE = require('./constants.js').MODE_FILE;

function Node(options) {
  var now = Date.now();

  this.id = options.id;
  this.mode = options.mode || MODE_FILE;  // node type (file, directory, etc)
  this.size = options.size || 0; // size (bytes for files, entries for directories)
  this.atime = options.atime || now; // access time (will mirror ctime after creation)
  this.ctime = options.ctime || now; // creation/change time
  this.mtime = options.mtime || now; // modified time
  this.flags = options.flags || []; // file flags
  this.xattrs = options.xattrs || {}; // extended attributes
  this.nlinks = options.nlinks || 0; // links count
  this.version = options.version || 0; // node version
  this.blksize = undefined; // block size
  this.nblocks = 1; // blocks count
  this.data = options.data; // id for data object
}

// Make sure the options object has an id on property,
// either from caller or one we generate using supplied guid fn.
function ensureID(options, prop, callback) {
  if(options[prop]) {
    callback(null);
  } else {
    options.guid(function(err, id) {
      options[prop] = id;
      callback(err);
    });
  }
}

Node.create = function(options, callback) {
  // We expect both options.id and options.data to be provided/generated.
  ensureID(options, 'id', function(err) {
    if(err) {
      callback(err);
      return;
    }

    ensureID(options, 'data', function(err) {
      if(err) {
        callback(err);
        return;
      }

      callback(null, new Node(options));
    });
  });
};

module.exports = Node;

},{"./constants.js":52}],61:[function(require,module,exports){
var Errors = require('./errors.js');

function OpenFileDescription(path, id, flags, position) {
  this.path = path;
  this.id = id;
  this.flags = flags;
  this.position = position;
}

// Tries to find the node associated with an ofd's `id`.
// If not found, an error is returned on the callback.
OpenFileDescription.prototype.getNode = function(context, callback) {
  var id = this.id;
  var path = this.path;

  function check_if_node_exists(error, node) {
    if(error) {
      return callback(error);
    }

    if(!node) {
      return callback(new Errors.EBADF('file descriptor refers to unknown node', path));
    }

    callback(null, node);
  }

  context.getObject(id, check_if_node_exists);
};

module.exports = OpenFileDescription;

},{"./errors.js":55}],62:[function(require,module,exports){
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
    // XXXfiler: we don't have process.cwd() so we use '/' as a fallback
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
  from = resolve(from).substr(1);
  to = resolve(to).substr(1);

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
  // XXXfiler: node.js just does `return f`
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

// Make sure we don't double-add a trailing slash (e.g., '/' -> '//')
function addTrailing(path) {
  return path.replace(/\/*$/, '/');
}

// Deal with multiple slashes at the end, one, or none
// and make sure we don't return the empty string.
function removeTrailing(path) {
  path = path.replace(/\/*$/, '');
  return path === '' ? '/' : path;
}

// XXXfiler: we don't support path.exists() or path.existsSync(), which
// are deprecated, and need a FileSystem instance to work. Use fs.stat().

module.exports = {
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
  isNull: isNull,
  // Non-node but useful...
  addTrailing: addTrailing,
  removeTrailing: removeTrailing
};

},{}],63:[function(require,module,exports){
var IndexedDB = require('./indexeddb.js');
var WebSQL = require('./websql.js');
var Memory = require('./memory.js');

module.exports = {
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

},{"./indexeddb.js":64,"./memory.js":65,"./websql.js":66}],64:[function(require,module,exports){
(function (global,Buffer){
var FILE_SYSTEM_NAME = require('../constants.js').FILE_SYSTEM_NAME;
var FILE_STORE_NAME = require('../constants.js').FILE_STORE_NAME;
var IDB_RW = require('../constants.js').IDB_RW;
var IDB_RO = require('../constants.js').IDB_RO;
var Errors = require('../errors.js');
var FilerBuffer = require('../buffer.js');

var indexedDB = global.indexedDB       ||
                global.mozIndexedDB    ||
                global.webkitIndexedDB ||
                global.msIndexedDB;

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

function _get(objectStore, key, callback) {
  try {
    var request = objectStore.get(key);
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
}
IndexedDBContext.prototype.getObject = function(key, callback) {
  _get(this.objectStore, key, callback);
};
IndexedDBContext.prototype.getBuffer = function(key, callback) {
  _get(this.objectStore, key, function(err, arrayBuffer) {
    if(err) {
      return callback(err);
    }
    callback(null, new FilerBuffer(arrayBuffer));
  });
};

function _put(objectStore, key, value, callback) {
  try {
    var request = objectStore.put(value, key);
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
}
IndexedDBContext.prototype.putObject = function(key, value, callback) {
  _put(this.objectStore, key, value, callback);
};
IndexedDBContext.prototype.putBuffer = function(key, uint8BackedBuffer, callback) {
  var buf;
  if(!Buffer._useTypedArrays) { // workaround for fxos 1.3
    buf = uint8BackedBuffer.toArrayBuffer();
  } else {
    buf = uint8BackedBuffer.buffer;
  }
  _put(this.objectStore, key, buf, callback);
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
  if(that.db) {
    return callback();
  }

  // NOTE: we're not using versioned databases.
  var openRequest = indexedDB.open(that.name);

  // If the db doesn't exist, we'll create it
  openRequest.onupgradeneeded = function onupgradeneeded(event) {
    var db = event.target.result;

    if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
      db.deleteObjectStore(FILE_STORE_NAME);
    }
    db.createObjectStore(FILE_STORE_NAME);
  };

  openRequest.onsuccess = function onsuccess(event) {
    that.db = event.target.result;
    callback();
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

module.exports = IndexedDB;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"../buffer.js":51,"../constants.js":52,"../errors.js":55,"buffer":38}],65:[function(require,module,exports){
var FILE_SYSTEM_NAME = require('../constants.js').FILE_SYSTEM_NAME;
// NOTE: prefer setImmediate to nextTick for proper recursion yielding.
// see https://github.com/js-platform/filer/pull/24
var asyncCallback = require('../../lib/async.js').setImmediate;

/**
 * Make shared in-memory DBs possible when using the same name.
 */
var createDB = (function() {
  var pool = {};
  return function getOrCreate(name) {
    if(!pool.hasOwnProperty(name)) {
      pool[name] = {};
    }
    return pool[name];
  };
}());

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

// Memory context doesn't care about differences between Object and Buffer
MemoryContext.prototype.getObject =
MemoryContext.prototype.getBuffer =
function(key, callback) {
  var that = this;
  asyncCallback(function() {
    callback(null, that.objectStore[key]);
  });
};
MemoryContext.prototype.putObject =
MemoryContext.prototype.putBuffer =
function(key, value, callback) {
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
}
Memory.isSupported = function() {
  return true;
};

Memory.prototype.open = function(callback) {
  this.db = createDB(this.name);
  asyncCallback(callback);
};
Memory.prototype.getReadOnlyContext = function() {
  return new MemoryContext(this.db, true);
};
Memory.prototype.getReadWriteContext = function() {
  return new MemoryContext(this.db, false);
};

module.exports = Memory;

},{"../../lib/async.js":1,"../constants.js":52}],66:[function(require,module,exports){
(function (global){
var FILE_SYSTEM_NAME = require('../constants.js').FILE_SYSTEM_NAME;
var FILE_STORE_NAME = require('../constants.js').FILE_STORE_NAME;
var WSQL_VERSION = require('../constants.js').WSQL_VERSION;
var WSQL_SIZE = require('../constants.js').WSQL_SIZE;
var WSQL_DESC = require('../constants.js').WSQL_DESC;
var Errors = require('../errors.js');
var FilerBuffer = require('../buffer.js');
var base64ArrayBuffer = require('base64-arraybuffer');

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

function _get(getTransaction, key, callback) {
  function onSuccess(transaction, result) {
    // If the key isn't found, return null
    var value = result.rows.length === 0 ? null : result.rows.item(0).data;
    callback(null, value);
  }
  function onError(transaction, error) {
    callback(error);
  }
  getTransaction(function(transaction) {
    transaction.executeSql("SELECT data FROM " + FILE_STORE_NAME + " WHERE id = ? LIMIT 1;",
                           [key], onSuccess, onError);
  });
}
WebSQLContext.prototype.getObject = function(key, callback) {
  _get(this.getTransaction, key, function(err, result) {
    if(err) {
      return callback(err);
    }

    try {
      if(result) {
        result = JSON.parse(result);
      }
    } catch(e) {
      return callback(e);
    }

    callback(null, result);
  });
};
WebSQLContext.prototype.getBuffer = function(key, callback) {
  _get(this.getTransaction, key, function(err, result) {
    if(err) {
      return callback(err);
    }

    // Deal with zero-length ArrayBuffers, which will be encoded as ''
    if(result || result === '') {
      var arrayBuffer = base64ArrayBuffer.decode(result);
      result = new FilerBuffer(arrayBuffer);
    }

    callback(null, result);
  });
};

function _put(getTransaction, key, value, callback) {
  function onSuccess(transaction, result) {
    callback(null);
  }
  function onError(transaction, error) {
    callback(error);
  }
  getTransaction(function(transaction) {
    transaction.executeSql("INSERT OR REPLACE INTO " + FILE_STORE_NAME + " (id, data) VALUES (?, ?);",
                           [key, value], onSuccess, onError);
  });
}
WebSQLContext.prototype.putObject = function(key, value, callback) {
  var json = JSON.stringify(value);
  _put(this.getTransaction, key, json, callback);
};
WebSQLContext.prototype.putBuffer = function(key, uint8BackedBuffer, callback) {
  var base64 = base64ArrayBuffer.encode(uint8BackedBuffer.buffer);
  _put(this.getTransaction, key, base64, callback);
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
  return !!global.openDatabase;
};

WebSQL.prototype.open = function(callback) {
  var that = this;

  // Bail if we already have a db open
  if(that.db) {
    return callback();
  }

  var db = global.openDatabase(that.name, WSQL_VERSION, WSQL_DESC, WSQL_SIZE);
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
    callback();
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

module.exports = WebSQL;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../buffer.js":51,"../constants.js":52,"../errors.js":55,"base64-arraybuffer":5}],67:[function(require,module,exports){
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  }).toUpperCase();
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

module.exports = {
  guid: guid,
  u8toArray: u8toArray,
  nop: nop
};

},{}],68:[function(require,module,exports){
var defaults = require('../constants.js').ENVIRONMENT;

module.exports = function Environment(env) {
  env = env || {};
  env.TMP = env.TMP || defaults.TMP;
  env.PATH = env.PATH || defaults.PATH;

  this.get = function(name) {
    return env[name];
  };

  this.set = function(name, value) {
    env[name] = value;
  };
};

},{"../constants.js":52}],69:[function(require,module,exports){
var Path = require('../path.js');
var Errors = require('../errors.js');
var Environment = require('./environment.js');
var async = require('../../lib/async.js');
var Encoding = require('../encoding.js');
var minimatch = require('minimatch');

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
    path = Path.resolve(cwd, path);
    // Make sure the path actually exists, and is a dir
    fs.stat(path, function(err, stats) {
      if(err) {
        callback(new Errors.ENOTDIR(null, path));
        return;
      }
      if(stats.type === 'DIRECTORY') {
        cwd = path;
        callback();
      } else {
        callback(new Errors.ENOTDIR(null, path));
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
  /* jshint evil:true */
  var sh = this;
  var fs = sh.fs;
  if(typeof args === 'function') {
    callback = args;
    args = [];
  }
  args = args || [];
  callback = callback || function(){};
  path = Path.resolve(sh.pwd(), path);

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
  var sh = this;
  var fs = sh.fs;
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  callback = callback || function(){};
  path = Path.resolve(sh.pwd(), path);

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
  var sh = this;
  var fs = sh.fs;
  var all = '';
  callback = callback || function(){};

  if(!files) {
    callback(new Errors.EINVAL('Missing files argument'));
    return;
  }

  files = typeof files === 'string' ? [ files ] : files;

  function append(item, callback) {
    var filename = Path.resolve(sh.pwd(), item);
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
  var sh = this;
  var fs = sh.fs;
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  callback = callback || function(){};

  if(!dir) {
    callback(new Errors.EINVAL('Missing dir argument'));
    return;
  }

  function list(path, callback) {
    var pathname = Path.resolve(sh.pwd(), path);
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

      async.eachSeries(entries, getDirEntry, function(error) {
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
  var sh = this;
  var fs = sh.fs;
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  callback = callback || function(){};

  if(!path) {
    callback(new Errors.EINVAL('Missing path argument'));
    return;
  }

  function remove(pathname, callback) {
    pathname = Path.resolve(sh.pwd(), pathname);
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
          callback(new Errors.ENOTEMPTY(null, pathname));
          return;
        }

        // Remove each dir entry recursively, then delete the dir.
        entries = entries.map(function(filename) {
          // Root dir entries absolutely
          return Path.join(pathname, filename);
        });
        async.eachSeries(entries, remove, function(error) {
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
  var sh = this;
  var fs = sh.fs;
  var tmp = sh.env.get('TMP');
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
  var sh = this;
  var fs = sh.fs;
  callback = callback || function(){};

  if(!path) {
    callback(new Errors.EINVAL('Missing path argument'));
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
          callback(new Errors.ENOTDIR(null, path));
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
 * Recursively walk a directory tree, reporting back all paths
 * that were found along the way. The `path` must be a dir.
 * Valid options include a `regex` for pattern matching paths
 * and an `exec` function of the form `function(path, next)` where
 * `path` is the current path that was found (dir paths have an '/'
 * appended) and `next` is a callback to call when done processing
 * the current path, passing any error object back as the first argument.
 * `find` returns a flat array of absolute paths for all matching/found
 * paths as the final argument to the callback.
 */
 Shell.prototype.find = function(path, options, callback) {
  var sh = this;
  var fs = sh.fs;
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  callback = callback || function(){};

  var exec = options.exec || function(path, next) { next(); };
  var found = [];

  if(!path) {
    callback(new Errors.EINVAL('Missing path argument'));
    return;
  }

  function processPath(path, callback) {
    exec(path, function(err) {
      if(err) {
        callback(err);
        return;
      }

      found.push(path);
      callback();
    });
  }

  function maybeProcessPath(path, callback) {
    // Test the path against the user's regex, name, path primaries (if any)
    // and remove any trailing slashes added previously.
    var rawPath = Path.removeTrailing(path);

    // Check entire path against provided regex, if any
    if(options.regex && !options.regex.test(rawPath)) {
      callback();
      return;
    }

    // Check basename for matches against name primary, if any
    if(options.name && !minimatch(Path.basename(rawPath), options.name)) {
      callback();
      return;
    }

    // Check dirname for matches against path primary, if any
    if(options.path && !minimatch(Path.dirname(rawPath), options.path)) {
      callback();
      return;
    }

    processPath(path, callback);
  }

  function walk(path, callback) {
    path = Path.resolve(sh.pwd(), path);

    // The path is either a file or dir, and instead of doing
    // a stat() to determine it first, we just try to readdir()
    // and it will either work or not, and we handle the non-dir error.
    fs.readdir(path, function(err, entries) {
      if(err) {
        if(err.code === 'ENOTDIR' /* file case, ignore error */) {
          maybeProcessPath(path, callback);
        } else {
          callback(err);
        }
        return;
      }

      // Path is really a dir, add a trailing / and report it found
      maybeProcessPath(Path.addTrailing(path), function(err) {
        if(err) {
          callback(err);
          return;
        }

        entries = entries.map(function(entry) {
          return Path.join(path, entry);
        });

        async.eachSeries(entries, walk, function(err) {
          callback(err, found);
        });
      });
    });
  }

  // Make sure we are starting with a dir path
  fs.stat(path, function(err, stats) {
    if(err) {
      callback(err);
      return;
    }
    if(!stats.isDirectory()) {
      callback(new Errors.ENOTDIR(null, path));
      return;
    }

    walk(path, callback);
  });
};

module.exports = Shell;

},{"../../lib/async.js":1,"../encoding.js":54,"../errors.js":55,"../path.js":62,"./environment.js":68,"minimatch":48}],70:[function(require,module,exports){
var Constants = require('./constants.js');

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

module.exports = Stats;

},{"./constants.js":52}],71:[function(require,module,exports){
var Constants = require('./constants.js');

function SuperNode(options) {
  var now = Date.now();

  this.id = Constants.SUPER_NODE_ID;
  this.mode = Constants.MODE_META;
  this.atime = options.atime || now;
  this.ctime = options.ctime || now;
  this.mtime = options.mtime || now;
  // root node id (randomly generated)
  this.rnode = options.rnode;
}

SuperNode.create = function(options, callback) {
  options.guid(function(err, rnode) {
    if(err) {
      callback(err);
      return;
    }
    options.rnode = options.rnode || rnode;
    callback(null, new SuperNode(options));
  });
};

module.exports = SuperNode;

},{"./constants.js":52}],72:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('trailing slashes in path names, issue 105', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should deal with trailing slashes properly, path == path/', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(err) {
      if(err) throw err;

      fs.mkdir('/tmp/foo', function(err) {
        if(err) throw err;

        // Without trailing slash
        fs.readdir('/tmp', function(err, result1) {
          if(err) throw err;
          expect(result1).to.exist;
          expect(result1.length).to.equal(1);

          // With trailing slash
          fs.readdir('/tmp/', function(err, result2) {
            if(err) throw err;
            expect(result2).to.exist;
            expect(result2[0]).to.equal('foo');
            expect(result1).to.deep.equal(result2);
            done();
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],73:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.writeFile truncation - issue 106', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should truncate an existing file', function(done) {
    var fs = util.fs();
    var filename = '/test';

    fs.writeFile(filename, '1', function(err) {
      if(err) throw err;

      fs.stat(filename, function(err, stats) {
        if(err) throw err;
        expect(stats.size).to.equal(1);

        fs.writeFile(filename, '', function(err) {
          if(err) throw err;

          fs.stat(filename, function(err, stats) {
            if(err) throw err;
            expect(stats.size).to.equal(0);
            done();
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],74:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.writeFile and non-existing directory, issue 239', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should give ENOENT if writing to a dir that does not exist', function(done) {
    var fs = util.fs();

    fs.writeFile('/abc.txt', 'content', function(err) {
      expect(err).not.to.exist;

      fs.writeFile('/abc.txt/abc.txt', 'content', function(err) {
        expect(err.code).to.equal('ENOENT');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],75:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('sh.cd doesn\'t seem to be working from a relative path if I am one or more folders deep, #247', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should properly deal with relative paths missing ./ and ../', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    sh.mkdirp('/home/scott', function(err) {
      if(err) throw err;

      sh.cd('/', function(err) {
        if(err) throw err;

        expect(sh.pwd()).to.equal('/');

        sh.cd('home', function(err) {
          if(err) throw err;

          expect(sh.pwd()).to.equal('/home');

          sh.cd('scott', function(err) {
            if(err) throw err;

            expect(sh.pwd()).to.equal('/home/scott');
            done();
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],76:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('Filer.Buffer should accept initialized ArrayBuffers, issue 249', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should accept an ArrayBuffer with a specified size', function(done) {
    var buffer = new Filer.Buffer(new ArrayBuffer(5));
    expect(buffer.length).to.equal(5);
    done();
  });
});

describe('Filer.Buffer static methods are in tact, issue 249', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should proxy Buffer.isBuffer', function(done) {
    expect(Filer.Buffer.isBuffer(new Filer.Buffer([]))).to.equal(true);
    expect(Filer.Buffer.isBuffer('')).to.equal(false);
    done();
  });

  it('should proxy Buffer.isEncoding', function(done) {
    expect(Filer.Buffer.isEncoding('utf8')).to.equal(true);
    expect(Filer.Buffer.isEncoding('smoop')).to.equal(false);
    done();
  });

  it('should proxy Buffer.byteLength', function(done) {
    expect(Filer.Buffer.byteLength('01100111', 'binary')).to.equal(8);
    done();
  });

  it('should proxy Buffer.concat', function(done) {
    expect(Filer.Buffer.concat([new Filer.Buffer(1), new Filer.Buffer(2)]).length).to.equal(3);
    done();
  });
});


},{"../..":59,"../lib/test-utils.js":87,"chai":6}],77:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('EISDIR when trying to open a dir path - issue 254', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with EISDIR for root dir', function(done) {
    var fs = util.fs();

    fs.readFile('/', function(err) {
      expect(err.code).to.equal('EISDIR');
      done();
    });
  });

  it('should fail with EISDIR for regular dir', function(done) {
    var fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.readFile('/dir', function(err) {
        expect(err.code).to.equal('EISDIR');
        done();
      });
    });
  });

  it('should fail with EISDIR for symlinked dir', function(done) {
    var fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.symlink('/dir', '/link', function(err) {
        if(err) throw err;

        fs.readFile('/link', function(err) {
          expect(err.code).to.equal('EISDIR');
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],78:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var setImmediate = require('../../lib/async.js').setImmediate;

describe('Queued operations should error when fs is in error state, issue 258', function() {
  var provider;

  // Provider that does nothing but fail on open.
  function FailingProviderContext(){}
  FailingProviderContext.prototype.clear = function(callback) {
    this.failCallback(callback);
  };
  FailingProviderContext.prototype.getObject =
  FailingProviderContext.prototype.getBuffer = function(key, callback) {
    this.failCallback(callback);
  };
  FailingProviderContext.prototype.putObject =
  FailingProviderContext.prototype.putBuffer = function(key, value, callback) {
    this.failCallback(callback);
  };
  FailingProviderContext.prototype.delete = function(key, callback) {
    this.failCallback(callback);
  };

  function FailingProvider() {
    var self = this;
    self.name = 'failure';
    self.open = function(callback) {
      // Wait until caller tells us to fail
      self.failNow = function() {
        self.failCallback(callback);
      };
    };
    self.failCallback = function(callback) {
      setImmediate(function() {
        callback(new Error);
      });
    };
  }
  FailingProvider.prototype.getReadWriteContext =
  FailingProvider.prototype.getReadWriteContext = function() {
    return new FailingProviderContext();
  };

  beforeEach(function() {
    provider = new FailingProvider();
  });

  afterEach(function() {
    provider = null;
  });

  it('should get EFILESYSTEMERROR errors on callbacks to queued operations on provider error', function(done) {
    var errCount = 0;
    var fs = new Filer.FileSystem({provider: provider});

    function maybeDone(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EFILESYSTEMERROR');
      errCount++;

      if(errCount === 2) {
        done();
      }
    }

    // Queue some fs operations, and expect them to fail
    fs.mkdir('/tmp', maybeDone);
    fs.writeFile('/file', 'data', maybeDone);

    // Operations are queued, tell the provider to fail now.
    provider.failNow();
  });

  it('should get EFILESYSTEMERROR errors on callbacks to queued operations after ready callback', function(done) {
    var fs = new Filer.FileSystem({provider: provider}, function(err) {
      expect(err).to.exist;

      // Queue is drained, but new operations should also fail
      fs.mkdir('/tmp', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EFILESYSTEMERROR');
        done();
      });
    });
    provider.failNow();
  });
});

},{"../..":59,"../../lib/async.js":1,"../lib/test-utils.js":87,"chai":6}],79:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readdir on non-dir paths, issue 267', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with ENOTDIR when called on filepath', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile.txt', 'data', function(err) {
      if(err) throw err;

      fs.readdir('/myfile.txt', function(err, contents) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],80:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('undefined and relative paths, issue270', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with EINVAL when called on an undefined path', function(done) {
    var fs = util.fs();

    fs.writeFile(undefined, 'data', function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });

  it('should fail with EINVAL when called on a relative path', function(done) {
    var fs = util.fs();

    fs.writeFile('relpath/file.txt', 'data', function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],81:[function(require,module,exports){
var Path = require('../..').Path;
var expect = require('chai').expect;

describe('Path.resolve does not work, issue357', function() {
  it('Path.relative() should not crash', function() {
    expect(Path.relative("/mydir", "/mydir/file")).to.equal("file");

    // https://nodejs.org/api/path.html#path_path_relative_from_to
    expect(Path.relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).to.equal("../../impl/bbb");
  });

  it('Path.resolve() should work as expectedh', function() {
    // https://nodejs.org/api/path.html#path_path_resolve_from_to
    expect(Path.resolve('/foo/bar', './baz')).to.equal('/foo/bar/baz');
    expect(Path.resolve('/foo/bar', '/tmp/file/')).to.equal('/tmp/file');
  });
});

},{"../..":59,"chai":6}],82:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var async = require('../../lib/async.js');

describe('sh.ls and deep directory trees', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should not crash when calling sh.ls() on deep directory layouts', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    var path = '';
    for(var i=0; i<50; i++) {
      path += '/' + i;
    }

    sh.mkdirp(path, function(err) {
      if(err) throw err;

      sh.ls('/', {recursive: true}, function(err, listing) {
        expect(err).not.to.exist;
        expect(listing).to.exist;
        done();
      });
    });
  });

  it('should not crash when calling sh.ls() on wide directory layouts', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    var dirName = '/dir';

    fs.mkdir(dirName, function(err) {
      if(err) throw err;

      var paths = [];
      for(var i=0; i<100; i++) {
        paths.push(Filer.Path.join(dirName, ''+i));
      }

      function writeFile(path, callback) {
        fs.writeFile(path, 'data', callback);
      }

      async.eachSeries(paths, writeFile, function(err) {
        if(err) { console.log('error', err);  throw err; }

        sh.ls('/', {recursive: true}, function(err, listing) {
          expect(err).not.to.exist;
          expect(listing).to.exist;
          done();
        });
      });
    });
  });
});

},{"../..":59,"../../lib/async.js":1,"../lib/test-utils.js":87,"chai":6}],83:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('trailing slashes in path names to work when renaming a dir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should deal with trailing slashes in rename, dir == dir/', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(err) {
      if(err) throw err;

      fs.rename('/tmp/', '/new-tmp/', function(err) {
        if(err) throw err;

        fs.stat('/new-tmp', function(err, stats) {
          if(err) throw err;
          expect(stats).to.exist;
          expect(stats.isDirectory()).to.be.true;

          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],84:[function(require,module,exports){
/**
 * Add your test spec files to the list in order to
 * get them running by default.
 */

// Filer
require("./spec/filer.spec");

// Filer.FileSystem.*
require("./spec/filer.filesystem.spec");
require("./spec/fs.spec");
require("./spec/fs.stat.spec");
require("./spec/fs.lstat.spec");
require("./spec/fs.exists.spec");
require("./spec/fs.mknod.spec");
require("./spec/fs.mkdir.spec");
require("./spec/fs.readdir.spec");
require("./spec/fs.rmdir.spec");
require("./spec/fs.open.spec");
require("./spec/fs.write.spec");
require("./spec/fs.writeFile-readFile.spec");
require("./spec/fs.appendFile.spec");
require("./spec/fs.read.spec");
require("./spec/fs.close.spec");
require("./spec/fs.link.spec");
require("./spec/fs.unlink.spec");
require("./spec/fs.rename.spec");
require("./spec/fs.lseek.spec");
require("./spec/fs.symlink.spec");
require("./spec/fs.readlink.spec");
require("./spec/fs.truncate.spec");
require("./spec/fs.utimes.spec");
require("./spec/fs.xattr.spec");
require("./spec/fs.stats.spec");
require("./spec/path-resolution.spec");
require("./spec/trailing-slashes.spec");
require("./spec/times.spec");
require("./spec/time-flags.spec");
require("./spec/fs.watch.spec");
require("./spec/errors.spec");
require("./spec/fs.shell.spec");

// Filer.FileSystem.providers.*
require("./spec/providers/providers.spec");
require("./spec/providers/providers.indexeddb.spec");
require("./spec/providers/providers.websql.spec");
require("./spec/providers/providers.memory.spec");

// Filer.FileSystemShell.*
require("./spec/shell/cd.spec");
require("./spec/shell/touch.spec");
require("./spec/shell/exec.spec");
require("./spec/shell/cat.spec");
require("./spec/shell/ls.spec");
require("./spec/shell/rm.spec");
require("./spec/shell/env.spec");
require("./spec/shell/mkdirp.spec");
require("./spec/shell/find.spec");

// Ported node.js tests (filenames match names in https://github.com/joyent/node/tree/master/test)
require("./spec/node-js/simple/test-fs-mkdir");
require("./spec/node-js/simple/test-fs-null-bytes");
require("./spec/node-js/simple/test-fs-watch");
require("./spec/node-js/simple/test-fs-watch-recursive");

// Regressions, Bugs
// NOTE: bugs/issue225.js has to be run outside this step, see gruntfile.js
require("./bugs/issue105");
require("./bugs/issue106");
require("./bugs/issue239");
require("./bugs/issue249");
require("./bugs/ls-depth-bug");
require("./bugs/issue247.js");
require("./bugs/issue254.js");
require("./bugs/issue258.js");
require("./bugs/issue267.js");
require("./bugs/issue270.js");
require("./bugs/rename-dir-trailing-slash.js");
require("./bugs/issue357.js");

},{"./bugs/issue105":72,"./bugs/issue106":73,"./bugs/issue239":74,"./bugs/issue247.js":75,"./bugs/issue249":76,"./bugs/issue254.js":77,"./bugs/issue258.js":78,"./bugs/issue267.js":79,"./bugs/issue270.js":80,"./bugs/issue357.js":81,"./bugs/ls-depth-bug":82,"./bugs/rename-dir-trailing-slash.js":83,"./spec/errors.spec":89,"./spec/filer.filesystem.spec":90,"./spec/filer.spec":91,"./spec/fs.appendFile.spec":92,"./spec/fs.close.spec":93,"./spec/fs.exists.spec":94,"./spec/fs.link.spec":95,"./spec/fs.lseek.spec":96,"./spec/fs.lstat.spec":97,"./spec/fs.mkdir.spec":98,"./spec/fs.mknod.spec":99,"./spec/fs.open.spec":100,"./spec/fs.read.spec":101,"./spec/fs.readdir.spec":102,"./spec/fs.readlink.spec":103,"./spec/fs.rename.spec":104,"./spec/fs.rmdir.spec":105,"./spec/fs.shell.spec":106,"./spec/fs.spec":107,"./spec/fs.stat.spec":108,"./spec/fs.stats.spec":109,"./spec/fs.symlink.spec":110,"./spec/fs.truncate.spec":111,"./spec/fs.unlink.spec":112,"./spec/fs.utimes.spec":113,"./spec/fs.watch.spec":114,"./spec/fs.write.spec":115,"./spec/fs.writeFile-readFile.spec":116,"./spec/fs.xattr.spec":117,"./spec/node-js/simple/test-fs-mkdir":118,"./spec/node-js/simple/test-fs-null-bytes":119,"./spec/node-js/simple/test-fs-watch":121,"./spec/node-js/simple/test-fs-watch-recursive":120,"./spec/path-resolution.spec":122,"./spec/providers/providers.indexeddb.spec":124,"./spec/providers/providers.memory.spec":125,"./spec/providers/providers.spec":126,"./spec/providers/providers.websql.spec":127,"./spec/shell/cat.spec":128,"./spec/shell/cd.spec":129,"./spec/shell/env.spec":130,"./spec/shell/exec.spec":131,"./spec/shell/find.spec":132,"./spec/shell/ls.spec":133,"./spec/shell/mkdirp.spec":134,"./spec/shell/rm.spec":135,"./spec/shell/touch.spec":136,"./spec/time-flags.spec":137,"./spec/times.spec":138,"./spec/trailing-slashes.spec":139}],85:[function(require,module,exports){
(function (global){
var Filer = require("../..");

var indexedDB = global.indexedDB       ||
                global.mozIndexedDB    ||
                global.webkitIndexedDB ||
                global.msIndexedDB;

var needsCleanup = [];
if(global.addEventListener) {
  global.addEventListener('beforeunload', function() {
    needsCleanup.forEach(function(f) { f(); });
  });
}

function IndexedDBTestProvider(name) {
  var _done = false;
  var that = this;

  function cleanup(callback) {
    callback = callback || function(){};

    if(!that.provider || _done) {
      return callback();
    }

    // We have to force any other connections to close
    // before we can delete a db.
    if(that.provider.db) {
      that.provider.db.close();
    }

    var request = indexedDB.deleteDatabase(name);
    function finished() {
      that.provider = null;
      _done = true;
      callback();
    }
    request.onsuccess = finished;
    request.onerror = finished;
  }

  function init() {
    if(that.provider) {
      return;
    }
    that.provider = new Filer.FileSystem.providers.IndexedDB(name);
    needsCleanup.push(cleanup);
  }

  this.init = init;
  this.cleanup = cleanup;
}
IndexedDBTestProvider.isSupported = function() {
  return Filer.FileSystem.providers.IndexedDB.isSupported();
};

module.exports = IndexedDBTestProvider;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../..":59}],86:[function(require,module,exports){
var Filer = require('../..');

function MemoryTestProvider(name) {
  var that = this;

  function cleanup(callback) {
    callback = callback || function(){};

    that.provider = null;
    callback();
  }

  function init() {
    if(that.provider) {
      return;
    }
    that.provider = new Filer.FileSystem.providers.Memory(name);
  }

  this.init = init;
  this.cleanup = cleanup;
}
MemoryTestProvider.isSupported = function() {
  return Filer.FileSystem.providers.Memory.isSupported();
};

module.exports = MemoryTestProvider;

},{"../..":59}],87:[function(require,module,exports){
(function (global){
var Filer = require('../..');
var IndexedDBTestProvider = require('./indexeddb.js');
var WebSQLTestProvider = require('./websql.js');
var MemoryTestProvider = require('./memory.js');
var Url = require('url');

var _provider;
var _fs;

function uniqueName() {
  if(!uniqueName.seed) {
    uniqueName.seed = Date.now();
  }
  return 'filer-testdb-' + uniqueName.seed++;
}

function findBestProvider() {
  var providers = Filer.FileSystem.providers;
  if(providers.IndexedDB.isSupported()) {
    return IndexedDBTestProvider;
  }
  if(providers.WebSQL.isSupported()) {
    return WebSQLTestProvider;
  }
  return MemoryTestProvider;
}

function getUrlParams() {
  // Check if we are running in node
  if(!global.location) {
    return null;
  }

  var url = Url.parse(global.location.href, true);

  return url.query;
}

function getProviderType() {
  var defaultProvider = 'Memory';
  var queryString = getUrlParams();

  // If the environment is node or the query string is empty,
  // the memory provider will be used.
  if(!queryString) {
    return defaultProvider;
  }

  return queryString['filer-provider'] || defaultProvider;
}

function setup(callback) {
  // In browser we support specifying the provider via the query string
  // (e.g., ?filer-provider=IndexedDB). If not specified, we use
  // the Memory provider by default.
  var providerType = getProviderType();

  var name = uniqueName();

  switch(providerType.toLowerCase()) {
    case 'indexeddb':
      _provider = new IndexedDBTestProvider(name);
      break;
    case 'websql':
      _provider = new WebSQLTestProvider(name);
      break;
    case 'memory':
    /* falls through */
    default:
      var BestProvider = findBestProvider();
      _provider = new BestProvider(name);
      break;
  }

  // Allow passing FS flags on query string
  var flags = global.filerArgs && global.filerArgs.flags ?
    global.filerArgs.flags : 'FORMAT';

  // Create a file system and wait for it to get setup
  _provider.init();

  function complete(err, fs) {
    if(err) throw err;
    _fs = fs;
    callback();
  }
  return new Filer.FileSystem({
    name: name,
    provider: _provider.provider,
    flags: flags
  }, complete);
}

function fs() {
  if(!_fs) {
    throw "TestUtil: call setup() before fs()";
  }
  return _fs;
}

function provider() {
  if(!_provider) {
    throw "TestUtil: call setup() before provider()";
  }
  return _provider;
}

function shell(options) {
  var _fs = fs();
  return new _fs.Shell(options);
}

function cleanup(callback) {
  if(!_provider) {
    return;
  }
  _provider.cleanup(function() {
    _provider = null;
    _fs = null;
    callback();
  });
}

function typedArrayEqual(a, b) {
  if(!(a && b)) {
    return false;
  }
  if(a.length !== b.length) {
    return false;
  }

  for(var i = 0; i < a.length; ++ i) {
    if(a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

module.exports = {
  uniqueName: uniqueName,
  setup: setup,
  fs: fs,
  shell: shell,
  provider: provider,
  providers: {
    IndexedDB: IndexedDBTestProvider,
    WebSQL: WebSQLTestProvider,
    Memory: MemoryTestProvider
  },
  cleanup: cleanup,
  typedArrayEqual: typedArrayEqual
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../..":59,"./indexeddb.js":85,"./memory.js":86,"./websql.js":88,"url":47}],88:[function(require,module,exports){
(function (global){
var Filer = require('../..');

var needsCleanup = [];
if(global.addEventListener) {
  global.addEventListener('beforeunload', function() {
    needsCleanup.forEach(function(f) { f(); });
  });
}

function WebSQLTestProvider(name) {
  var _done = false;
  var that = this;

  function cleanup(callback) {
    callback = callback || function(){};

    if(!that.provider || _done) {
      return callback();
    }

    // Provider is there, but db was never touched
    if(!that.provider.db) {
      return callback();
    }

    var context = that.provider.getReadWriteContext();
    context.clear(function() {
      that.provider = null;
      _done = true;
      callback();
    });
  }

  function init() {
    if(that.provider) {
      return;
    }
    that.provider = new Filer.FileSystem.providers.WebSQL(name);
    needsCleanup.push(cleanup);
  }

  this.init = init;
  this.cleanup = cleanup;
}
WebSQLTestProvider.isSupported = function() {
  return Filer.FileSystem.providers.WebSQL.isSupported();
};

module.exports = WebSQLTestProvider;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../..":59}],89:[function(require,module,exports){
var Filer = require('../..');
var expect = require('chai').expect;

describe("Filer.Errors", function() {
  it("has expected errors", function() {
    expect(Filer.Errors).to.exist;

    // By ctor -- if you add some to src/errors.js, also add here
    //expect(Filer.Errors.UNKNOWN).to.be.a('function');
    //expect(Filer.Errors.OK).to.be.a('function');
    //expect(Filer.Errors.EOF).to.be.a('function');
    //expect(Filer.Errors.EADDRINFO).to.be.a('function');
    //expect(Filer.Errors.EACCES).to.be.a('function');
    //expect(Filer.Errors.EAGAIN).to.be.a('function');
    //expect(Filer.Errors.EADDRINUSE).to.be.a('function');
    //expect(Filer.Errors.EADDRNOTAVAIL).to.be.a('function');
    //expect(Filer.Errors.EAFNOSUPPORT).to.be.a('function');
    //expect(Filer.Errors.EALREADY).to.be.a('function');
    expect(Filer.Errors.EBADF).to.be.a('function');
    expect(Filer.Errors.EBUSY).to.be.a('function');
    //expect(Filer.Errors.ECONNABORTED).to.be.a('function');
    //expect(Filer.Errors.ECONNREFUSED).to.be.a('function');
    //expect(Filer.Errors.ECONNRESET).to.be.a('function');
    //expect(Filer.Errors.EDESTADDRREQ).to.be.a('function');
    //expect(Filer.Errors.EFAULT).to.be.a('function');
    //expect(Filer.Errors.EHOSTUNREACH).to.be.a('function');
    //expect(Filer.Errors.EINTR).to.be.a('function');
    expect(Filer.Errors.EINVAL).to.be.a('function');
    //expect(Filer.Errors.EISCONN).to.be.a('function');
    //expect(Filer.Errors.EMFILE).to.be.a('function');
    //expect(Filer.Errors.EMSGSIZE).to.be.a('function');
    //expect(Filer.Errors.ENETDOWN).to.be.a('function');
    //expect(Filer.Errors.ENETUNREACH).to.be.a('function');
    //expect(Filer.Errors.ENFILE).to.be.a('function');
    //expect(Filer.Errors.ENOBUFS).to.be.a('function');
    //expect(Filer.Errors.ENOMEM).to.be.a('function');
    expect(Filer.Errors.ENOTDIR).to.be.a('function');
    expect(Filer.Errors.EISDIR).to.be.a('function');
    //expect(Filer.Errors.ENONET).to.be.a('function');
    //expect(Filer.Errors.ENOTCONN).to.be.a('function');
    //expect(Filer.Errors.ENOTSOCK).to.be.a('function');
    //expect(Filer.Errors.ENOTSUP).to.be.a('function');
    expect(Filer.Errors.ENOENT).to.be.a('function');
    //expect(Filer.Errors.ENOSYS).to.be.a('function');
    //expect(Filer.Errors.EPIPE).to.be.a('function');
    //expect(Filer.Errors.EPROTO).to.be.a('function');
    //expect(Filer.Errors.EPROTONOSUPPORT).to.be.a('function');
    //expect(Filer.Errors.EPROTOTYPE).to.be.a('function');
    //expect(Filer.Errors.ETIMEDOUT).to.be.a('function');
    //expect(Filer.Errors.ECHARSET).to.be.a('function');
    //expect(Filer.Errors.EAIFAMNOSUPPORT).to.be.a('function');
    //expect(Filer.Errors.EAISERVICE).to.be.a('function');
    //expect(Filer.Errors.EAISOCKTYPE).to.be.a('function');
    //expect(Filer.Errors.ESHUTDOWN).to.be.a('function');
    expect(Filer.Errors.EEXIST).to.be.a('function');
    //expect(Filer.Errors.ESRCH).to.be.a('function');
    //expect(Filer.Errors.ENAMETOOLONG).to.be.a('function');
    //expect(Filer.Errors.EPERM).to.be.a('function');
    expect(Filer.Errors.ELOOP).to.be.a('function');
    //expect(Filer.Errors.EXDEV).to.be.a('function');
    expect(Filer.Errors.ENOTEMPTY).to.be.a('function');
    //expect(Filer.Errors.ENOSPC).to.be.a('function');
    expect(Filer.Errors.EIO).to.be.a('function');
    //expect(Filer.Errors.EROFS).to.be.a('function');
    //expect(Filer.Errors.ENODEV).to.be.a('function');
    //expect(Filer.Errors.ESPIPE).to.be.a('function');
    //expect(Filer.Errors.ECANCELED).to.be.a('function');
    expect(Filer.Errors.ENOTMOUNTED).to.be.a('function');
    expect(Filer.Errors.EFILESYSTEMERROR).to.be.a('function');
    expect(Filer.Errors.ENOATTR).to.be.a('function');

    // By errno
    //expect(Filer.Errors[-1]).to.equal(Filer.Errors.UNKNOWN);
    //expect(Filer.Errors[0]).to.equal(Filer.Errors.OK);
    //expect(Filer.Errors[1]).to.equal(Filer.Errors.EOF);
    //expect(Filer.Errors[2]).to.equal(Filer.Errors.EADDRINFO);
    //expect(Filer.Errors[3]).to.equal(Filer.Errors.EACCES);
    //expect(Filer.Errors[4]).to.equal(Filer.Errors.EAGAIN);
    //expect(Filer.Errors[5]).to.equal(Filer.Errors.EADDRINUSE);
    //expect(Filer.Errors[6]).to.equal(Filer.Errors.EADDRNOTAVAIL);
    //expect(Filer.Errors[7]).to.equal(Filer.Errors.EAFNOSUPPORT);
    //expect(Filer.Errors[8]).to.equal(Filer.Errors.EALREADY);
    expect(Filer.Errors[9]).to.equal(Filer.Errors.EBADF);
    expect(Filer.Errors[10]).to.equal(Filer.Errors.EBUSY);
    //expect(Filer.Errors[11]).to.equal(Filer.Errors.ECONNABORTED);
    //expect(Filer.Errors[12]).to.equal(Filer.Errors.ECONNREFUSED);
    //expect(Filer.Errors[13]).to.equal(Filer.Errors.ECONNRESET);
    //expect(Filer.Errors[14]).to.equal(Filer.Errors.EDESTADDRREQ);
    //expect(Filer.Errors[15]).to.equal(Filer.Errors.EFAULT);
    //expect(Filer.Errors[16]).to.equal(Filer.Errors.EHOSTUNREACH);
    //expect(Filer.Errors[17]).to.equal(Filer.Errors.EINTR);
    expect(Filer.Errors[18]).to.equal(Filer.Errors.EINVAL);
    //expect(Filer.Errors[19]).to.equal(Filer.Errors.EISCONN);
    //expect(Filer.Errors[20]).to.equal(Filer.Errors.EMFILE);
    //expect(Filer.Errors[21]).to.equal(Filer.Errors.EMSGSIZE);
    //expect(Filer.Errors[22]).to.equal(Filer.Errors.ENETDOWN);
    //expect(Filer.Errors[23]).to.equal(Filer.Errors.ENETUNREACH);
    //expect(Filer.Errors[24]).to.equal(Filer.Errors.ENFILE);
    //expect(Filer.Errors[25]).to.equal(Filer.Errors.ENOBUFS);
    //expect(Filer.Errors[26]).to.equal(Filer.Errors.ENOMEM);
    expect(Filer.Errors[27]).to.equal(Filer.Errors.ENOTDIR);
    expect(Filer.Errors[28]).to.equal(Filer.Errors.EISDIR);
    //expect(Filer.Errors[29]).to.equal(Filer.Errors.ENONET);
    //expect(Filer.Errors[31]).to.equal(Filer.Errors.ENOTCONN);
    //expect(Filer.Errors[32]).to.equal(Filer.Errors.ENOTSOCK);
    //expect(Filer.Errors[33]).to.equal(Filer.Errors.ENOTSUP);
    expect(Filer.Errors[34]).to.equal(Filer.Errors.ENOENT);
    //expect(Filer.Errors[35]).to.equal(Filer.Errors.ENOSYS);
    //expect(Filer.Errors[36]).to.equal(Filer.Errors.EPIPE);
    //expect(Filer.Errors[37]).to.equal(Filer.Errors.EPROTO);
    //expect(Filer.Errors[38]).to.equal(Filer.Errors.EPROTONOSUPPORT);
    //expect(Filer.Errors[39]).to.equal(Filer.Errors.EPROTOTYPE);
    //expect(Filer.Errors[40]).to.equal(Filer.Errors.ETIMEDOUT);
    //expect(Filer.Errors[41]).to.equal(Filer.Errors.ECHARSET);
    //expect(Filer.Errors[42]).to.equal(Filer.Errors.EAIFAMNOSUPPORT);
    //expect(Filer.Errors[44]).to.equal(Filer.Errors.EAISERVICE);
    //expect(Filer.Errors[45]).to.equal(Filer.Errors.EAISOCKTYPE);
    //expect(Filer.Errors[46]).to.equal(Filer.Errors.ESHUTDOWN);
    expect(Filer.Errors[47]).to.equal(Filer.Errors.EEXIST);
    //expect(Filer.Errors[48]).to.equal(Filer.Errors.ESRCH);
    //expect(Filer.Errors[49]).to.equal(Filer.Errors.ENAMETOOLONG);
    //expect(Filer.Errors[50]).to.equal(Filer.Errors.EPERM);
    expect(Filer.Errors[51]).to.equal(Filer.Errors.ELOOP);
    //expect(Filer.Errors[52]).to.equal(Filer.Errors.EXDEV);
    expect(Filer.Errors[53]).to.equal(Filer.Errors.ENOTEMPTY);
    //expect(Filer.Errors[54]).to.equal(Filer.Errors.ENOSPC);
    expect(Filer.Errors[55]).to.equal(Filer.Errors.EIO);
    //expect(Filer.Errors[56]).to.equal(Filer.Errors.EROFS);
    //expect(Filer.Errors[57]).to.equal(Filer.Errors.ENODEV);
    //expect(Filer.Errors[58]).to.equal(Filer.Errors.ESPIPE);
    //expect(Filer.Errors[59]).to.equal(Filer.Errors.ECANCELED);
    expect(Filer.Errors[1000]).to.equal(Filer.Errors.ENOTMOUNTED);
    expect(Filer.Errors[1001]).to.equal(Filer.Errors.EFILESYSTEMERROR);
    expect(Filer.Errors[1002]).to.equal(Filer.Errors.ENOATTR);
  });

  it('should include all expected properties by default', function() {
    var err = new Filer.Errors.ENOENT();
    expect(err.name).to.equal('ENOENT');
    expect(err.code).to.equal('ENOENT');
    expect(err.errno).to.equal(34);
    expect(err.message).to.equal('no such file or directory');
  });

  it('should include extra properties when provided', function() {
    var err = new Filer.Errors.ENOENT('This is the message', '/this/is/the/path');
    expect(err.name).to.equal('ENOENT');
    expect(err.code).to.equal('ENOENT');
    expect(err.errno).to.equal(34);
    expect(err.message).to.equal('This is the message');
    expect(err.path).to.equal('/this/is/the/path');
  });

  it('should include default message and path info when provided', function() {
    var err = new Filer.Errors.ENOENT(null, '/this/is/the/path');
    expect(err.message).to.equal('no such file or directory');
    expect(err.path).to.equal('/this/is/the/path');
  });

  it('should include just the message when no path provided', function() {
    var err = new Filer.Errors.ENOENT();
    expect(err.message).to.equal('no such file or directory');
    expect(err.path).not.to.exist;
  });

  it('should not include path in toString() when not provided', function() {
    var err = new Filer.Errors.ENOENT('This is the message');
    expect(err.toString()).to.equal("ENOENT: This is the message");
  });

  it('should include path in toString() when provided', function() {
    var err = new Filer.Errors.ENOENT(null, '/this/is/the/path');
    expect(err.toString()).to.equal("ENOENT: no such file or directory, '/this/is/the/path'");
  });

  it('should include message and path info when provided', function() {
    var err = new Filer.Errors.ENOENT('This is the message', '/this/is/the/path');
    expect(err.message).to.equal('This is the message');
    expect(err.path).to.equal('/this/is/the/path');
  });
});

},{"../..":59,"chai":6}],90:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe("Filer.FileSystem", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should properly mount new or existing filesystem', function(done) {
    var provider = util.provider().provider;

    // 1) Should be able to open a new filesystem, and get empty root
    var fs1 = new Filer.FileSystem({provider: provider}, function() {
      fs1.readdir('/', function(err, entries) {
        expect(err).not.to.exist;
        expect(entries).to.be.an('array');
        expect(entries.length).to.equal(0);

        fs1.writeFile('/file', 'data', function(err) {
          if(err) throw err;

          // 2) Should be able to open an existing filesystem
          var fs2 = new Filer.FileSystem({provider: provider}, function() {
            fs2.readdir('/', function(err, entries) {
              expect(err).not.to.exist;
              expect(entries).to.be.an('array');
              expect(entries.length).to.equal(1);
              expect(entries[0]).to.equal('file');


              // 3) FORMAT flag should wipe an existing filesystem
              var fs3 = new Filer.FileSystem({provider: provider, flags: ['FORMAT']}, function() {
                fs3.readdir('/', function(err, entries) {
                  expect(err).not.to.exist;
                  expect(entries).to.be.an('array');
                  expect(entries.length).to.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],91:[function(require,module,exports){
var Filer = require('../..');
var expect = require('chai').expect;

describe("Filer", function() {
  it("is defined", function() {
    expect(typeof Filer).not.to.equal(undefined);
  });

  it("has FileSystem constructor", function() {
    expect(typeof Filer.FileSystem).to.equal('function');
  });

  it("has Shell constructor", function() {
    expect(typeof Filer.Shell).to.equal('function');
  });
});

},{"../..":59,"chai":6}],92:[function(require,module,exports){
(function (Buffer){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.appendFile', function() {
  beforeEach(function(done) {
    util.setup(function() {
      var fs = util.fs();
      fs.writeFile('/myfile', "This is a file.", { encoding: 'utf8' }, function(error) {
        if(error) throw error;
        done();
      });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.appendFile).to.be.a('function');
  });

  it('should append a utf8 file without specifying utf8 in appendFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.appendFile('/myfile', more, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a utf8 file with "utf8" option to appendFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.appendFile('/myfile', more, 'utf8', function(error) {
      if(error) throw error;

      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a utf8 file with {encoding: "utf8"} option to appendFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.appendFile('/myfile', more, { encoding: 'utf8' }, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', { encoding: 'utf8' }, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a binary file', function(done) {
    var fs = util.fs();

    // String and utf8 binary encoded versions of the same thing:
    var contents = "This is a file.";
    var binary = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);
    var more = " Appended.";
    var binary2 = new Buffer([32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);
    var binary3 = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46,
                              32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);

    fs.writeFile('/mybinaryfile', binary, function(error) {
      if(error) throw error;

      fs.appendFile('/mybinaryfile', binary2, function(error) {
        if(error) throw error;

        fs.readFile('/mybinaryfile', 'ascii', function(error, data) {
          expect(error).not.to.exist;
          expect(data).to.deep.equal(binary3);
          done();
        });
      });
    });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.symlink('/myfile', '/myFileLink', function (error) {
      if (error) throw error;

      fs.appendFile('/myFileLink', more, 'utf8', function (error) {
        if (error) throw error;

        fs.readFile('/myFileLink', 'utf8', function(error, data) {
          expect(error).not.to.exist;
          expect(data).to.equal(contents + more);
          done();
        });
      });
    });
  });

  it('should work when file does not exist, and create the file', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.appendFile('/newfile', contents, { encoding: 'utf8' }, function(error) {
      expect(error).not.to.exist;

      fs.readFile('/newfile', 'utf8', function(err, data) {
        if(err) throw err;
        expect(data).to.equal(contents);
        done();
      });
    });
  });
});

}).call(this,require("buffer").Buffer)
},{"../..":59,"../lib/test-utils.js":87,"buffer":38,"chai":6}],93:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.close', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.close).to.equal('function');
  });

  it('should release the file descriptor', function(done) {
    var buffer = new Filer.Buffer(0);
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.close(fd, function(error) {
        fs.read(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          expect(error).to.exist;
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],94:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.exists', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.exists).to.equal('function');
  });

  it('should return false if path does not exist', function(done) {
    var fs = util.fs();

    fs.exists('/tmp', function(result) {
      expect(result).to.be.false;
      done();
    });
  });

  it('should return true if path exists', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(err, fd) {
      if(err) throw err;

      fs.close(fd, function(err) {
        if(err) throw err;

        fs.exists('/myfile', function(result) {
          expect(result).to.be.true;
          done();
        });
      });
    });
  });

  it('should follow symbolic links and return true for the resulting path', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.symlink('/myfile', '/myfilelink', function(error) {
          if(error) throw error;

          fs.exists('/myfilelink', function(result) {
            expect(result).to.be.true;
            done();
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],95:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.link', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.link).to.be.a('function');
  });

  it('should create a link to an existing file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.link('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            var _oldstats = result;
            fs.stat('/myotherfile', function(error, result) {
              expect(error).not.to.exist;
              expect(result.nlinks).to.equal(2);
              expect(result.dev).to.equal(_oldstats.dev);
              expect(result.node).to.equal(_oldstats.node);
              expect(result.size).to.equal(_oldstats.size);
              expect(result.type).to.equal(_oldstats.type);
              done();
            });
          });
        });
      });
    });
  });

  it('should not follow symbolic links', function(done) {
    var fs = util.fs();

    fs.stat('/', function (error, result) {
      if (error) throw error;
      var _oldstats = result;
      fs.symlink('/', '/myfileLink', function (error) {
        if (error) throw error;
        fs.link('/myfileLink', '/myotherfile', function (error) {
          if (error) throw error;
          fs.lstat('/myfileLink', function (error, result) {
            if (error) throw error;
            var _linkstats = result;
            fs.lstat('/myotherfile', function (error, result) {
              expect(error).not.to.exist;
              expect(result.dev).to.equal(_linkstats.dev);
              expect(result.node).to.equal(_linkstats.node);
              expect(result.size).to.equal(_linkstats.size);
              expect(result.type).to.equal(_linkstats.type);
              expect(result.nlinks).to.equal(2);
              done();
            });
          });
        });
      });
    });
  });

  it('should not allow links to a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.link('/mydir', '/mydirlink', function(error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EPERM');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],96:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.lseek', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.lseek).to.be.a('function');
  });

  it('should not follow symbolic links', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.close(fd, function (error) {
        if (error) throw error;

        fs.symlink('/myfile', '/myFileLink', function (error) {
          if (error) throw error;

          fs.rename('/myFileLink', '/myOtherFileLink', function (error) {
            if (error) throw error;

            fs.stat('/myfile', function (error, result) {
              expect(error).not.to.exist;

              fs.lstat('/myFileLink', function (error, result) {
                expect(error).to.exist;

                fs.stat('/myOtherFileLink', function (error, result) {
                  if (error) throw error;
                  expect(result.nlinks).to.equal(1);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should set the current position if whence is SET', function(done) {
    var fs = util.fs();
    var offset = 3;
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var result_buffer = new Filer.Buffer(buffer.length + offset);
    result_buffer.fill(0);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;

        fs.lseek(fd, offset, 'SET', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(offset);

          fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
            if(error) throw error;

            fs.read(fd, result_buffer, 0, result_buffer.length, 0, function(error, result) {
              if(error) throw error;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(offset + buffer.length);
                var expected = new Filer.Buffer([1, 2, 3, 1, 2, 3, 4, 5, 6, 7, 8]);
                expect(result_buffer).to.deep.equal(expected);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update the current position if whence is CUR', function(done) {
    var fs = util.fs();
    var offset = -2;
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var result_buffer = new Filer.Buffer(2 * buffer.length + offset);
    result_buffer.fill(0);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;

        fs.lseek(fd, offset, 'CUR', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(offset + buffer.length);

          fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
            if(error) throw error;

            fs.read(fd, result_buffer, 0, result_buffer.length, 0, function(error, result) {
              if(error) throw error;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(offset + 2 * buffer.length);
                var expected = new Filer.Buffer([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 8]);
                expect(result_buffer).to.deep.equal(expected);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update the current position if whence is END', function(done) {
    var fs = util.fs();
    var offset = 5;
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var result_buffer;

    fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd1 = result;
      fs.write(fd1, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;

        fs.open('/myfile', 'w+', function(error, result) {
          if(error) throw error;

          var fd2 = result;
          fs.lseek(fd2, offset, 'END', function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.equal(offset + buffer.length);

            fs.write(fd2, buffer, 0, buffer.length, undefined, function(error, result) {
              if(error) throw error;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(offset + 2 * buffer.length);
                result_buffer = new Filer.Buffer(result.size);
                result_buffer.fill(0);
                fs.read(fd2, result_buffer, 0, result_buffer.length, 0, function(error, result) {
                  if(error) throw error;
                  var expected = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
                  expect(result_buffer).to.deep.equal(expected);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],97:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.lstat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.lstat).to.equal('function');
  });

  it('should return an error if path does not exist', function(done) {
    var fs = util.fs();
    var _error, _result;

    fs.lstat('/tmp', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return a stat object if path is not a symbolic link', function(done) {
    var fs = util.fs();

    fs.lstat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.type).to.equal('DIRECTORY');
      done();
    });
  });

  it('should return a stat object if path is a symbolic link', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/mylink', function(error) {
      if(error) throw error;

      fs.lstat('/mylink', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('SYMLINK');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],98:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.mkdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.mkdir).to.be.a('function');
  });

  it('should return an error if part of the parent path does not exist', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return an error if the path already exists', function(done) {
    var fs = util.fs();

    fs.mkdir('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EEXIST");
      done();
    });
  });

  it('should make a new directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      expect(error).not.to.exist;
      if(error) throw error;

      fs.stat('/tmp', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats).to.exist;
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],99:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.mknod', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function(done) {
    var fs = util.fs();
    expect(fs.mknod).to.be.a('function');
    done();
  });

  it('should return an error if part of the parent path does not exist', function(done) {
    var fs = util.fs();

    fs.mknod('/dir/mydir', 'DIRECTORY', function(error) {
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if path already exists', function(done) {
    var fs = util.fs();

    fs.mknod('/', 'DIRECTORY', function(error) {
      expect(error.code).to.equal('EEXIST');
      done();
    });
  });

  it('should return an error if the parent node is not a directory', function(done) {
    var fs = util.fs();

    fs.mknod('/file', 'FILE' , function(error, result) {
      if(error) throw error;
      fs.mknod('/file/myfile', 'FILE', function(error, result) {
        expect(error.code).to.equal('ENOTDIR');
        done();
      });
    });
  });

  it('should return an error if the mode provided is not DIRECTORY or FILE', function(done) {
    var fs = util.fs();

    fs.mknod('/symlink', 'SYMLINK', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EINVAL');
      done();
    });
  });

  it('should make a new directory', function(done) {
    var fs = util.fs();

    fs.mknod('/dir', 'DIRECTORY', function(error) {
      if(error) throw error;

      fs.stat('/dir', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });

  it('should make a new file', function(done) {
    var fs = util.fs();

    fs.mknod('/file', 'FILE' , function(error, result) {
      if(error) throw error;
      fs.stat('/file', function(error, result) {
        expect(error).not.to.exist;
        expect(result.type).to.equal('FILE');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],100:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var constants = require('../../src/constants.js');

describe('fs.open', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.open).to.be.a('function');
  });

  it('should return an error if the parent path does not exist', function(done) {
    var fs = util.fs();

    fs.open('/tmp/myfile', 'w+', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return an error when flagged for read and the path does not exist', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'r+', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return an error when flagged for write and the path is a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp', 'w', function(error, result) {
        expect(error).to.exist;
        expect(error.code).to.equal("EISDIR");
        expect(result).not.to.exist;
        done();
      });
    });
  });

  it('should return an error when flagged for append and the path is a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp', 'a', function(error, result) {
        expect(error).to.exist;
        expect(error.code).to.equal("EISDIR");
        expect(result).not.to.exist;
        done();
      });
    });
  });

  it('should return a unique file descriptor', function(done) {
    var fs = util.fs();
    var fd1;

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(error).not.to.exist;
      expect(fd).to.be.a('number');

      fs.open('/file2', 'w+', function(error, fd) {
        if(error) throw error;
        expect(error).not.to.exist;
        expect(fd).to.be.a('number');
        expect(fd).not.to.equal(fd1);
        done();
      });
    });
  });

  it('should return the argument value of the file descriptor index matching the value set by the first useable file descriptor constant', function(done) {
    var fs = util.fs();
    var firstFD = constants.FIRST_DESCRIPTOR;
    var fd1;

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(fd).to.equal(firstFD);
      done();
    });
  });

  it('should create a new file when flagged for write', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      fs.stat('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('FILE');
        done();
      });
    });
  });

  /**
   * This test is currently correct per our code, but incorrect according to the spec.
   * When we fix https://github.com/filerjs/filer/issues/314 we'll have to update this.
   */
  it('should error if an ofd\'s node goes away while open', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;

      fs.open('/myfile', 'r', function(error, fd) {
        if(error) throw error;

        // Delete the file while it's still open
        fs.unlink('/myfile', function(error) {
          if(error) throw error;

          // This should fail now, since fd points to a bad node
          fs.fstat(fd, function(error, result) {
            expect(error).to.exist;
            expect(error.code).to.equal('EBADF');
            expect(result).not.to.exist;

            fs.close(fd);
            done();
          });
        });
      });
    });
  });
});

},{"../..":59,"../../src/constants.js":52,"../lib/test-utils.js":87,"chai":6}],101:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.read', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.read).to.be.a('function');
  });

  it('should read data from a file', function(done) {
    var fs = util.fs();
    var wbuffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = new Filer.Buffer(wbuffer.length);
    rbuffer.fill(0);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;
      fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.read(fd, rbuffer, 0, rbuffer.length, 0, function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(rbuffer.length);
          expect(wbuffer).to.deep.equal(rbuffer);
          done();
        });
      });
    });
  });

  it('should update the current file position', function(done) {
    var fs = util.fs();
    var wbuffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = new Filer.Buffer(wbuffer.length);
    rbuffer.fill(0);
    var _result = 0;

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.read(fd, rbuffer, 0, rbuffer.length / 2, undefined, function(error, result) {
          if(error) throw error;

          _result += result;
          fs.read(fd, rbuffer, rbuffer.length / 2, rbuffer.length, undefined, function(error, result) {
            if(error) throw error;
            _result += result;
            expect(error).not.to.exist;
            expect(_result).to.equal(rbuffer.length);
            expect(wbuffer).to.deep.equal(rbuffer);
            done();
          });
        });
      });
    });
  });

  it('should fail to read a directory', function(done) {
    var fs = util.fs();
    var buf = new Filer.Buffer(20);
    var buf2 = new Filer.Buffer(20);
    buf.fill(0);
    buf2.fill(0);

    fs.mkdir('/mydir', function(error) {
      if(error) throw err;

      fs.open('/mydir', 'r', function(error, fd) {
        if(error) throw error;

        fs.read(fd, buf, 0, buf.length, 0, function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal('EISDIR');
          expect(result).to.equal(0);
          expect(buf).to.deep.equal(buf2);
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],102:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.readdir).to.be.a('function');
  });

  it('should return an error if the path does not exist', function(done) {
    var fs = util.fs();

    fs.readdir('/tmp/mydir', function(error, files) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(files).not.to.exist;
      done();
    });
  });

  it('should return a list of files from an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;

      fs.readdir('/', function(error, files) {
        expect(error).not.to.exist;
        expect(files).to.exist;
        expect(files.length).to.equal(1);
        expect(files[0]).to.equal('tmp');
        done();
      });
    });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.symlink('/', '/tmp/dirLink', function(error) {
        if(error) throw error;
        fs.readdir('/tmp/dirLink', function(error, files) {
          expect(error).not.to.exist;
          expect(files).to.exist;
          expect(files.length).to.equal(1);
          expect(files[0]).to.equal('tmp');
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],103:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.readlink).to.be.a('function');
  });

  it('should return an error if part of the parent destination path does not exist', function(done) {
    var fs = util.fs();

    fs.readlink('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return an error if the path is not a symbolic link', function(done) {
    var fs = util.fs();

    fs.readlink('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return the contents of a symbolic link', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myfile', function(error) {
      if(error) throw error;

      fs.readlink('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.equal('/');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],104:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.rename', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.rename).to.be.a('function');
  });

  it('should rename an existing file', function(done) {
    var complete1 = false;
    var complete2 = false;
    var fs = util.fs();

    function maybeDone() {
      if(complete1 && complete2) {
        done();
      }
    }

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.rename('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          fs.stat('/myfile', function(error, result) {
            expect(error).to.exist;
            complete1 = true;
            maybeDone();
          });

          fs.stat('/myotherfile', function(error, result) {
            expect(error).not.to.exist;
            expect(result.nlinks).to.equal(1);
            complete2 = true;
            maybeDone();
          });
        });
      });
    });
  });

  it('should rename an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.rename('/mydir', '/myotherdir', function(error) {
        expect(error).not.to.exist;
        fs.stat('/mydir', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');

          fs.stat('/myotherdir', function(error, result) {
            expect(error).not.to.exist;
            expect(result.nlinks).to.equal(1);
            done();
          });
        });
      });
    });
  });

  it('should rename an existing directory if the new path points to an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.mkdir('/myotherdir', function(error) {
        if(error) throw error;

        fs.rename('/mydir', '/myotherdir', function(error) {
          expect(error).not.to.exist;
          fs.stat('/mydir', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOENT');

            fs.stat('/myotherdir', function(error, result) {
              expect(error).not.to.exist;
              expect(result.nlinks).to.equal(1);
              done();
            });
          });
        });
      });
    });
  });

  it('should fail to rename an existing directory if the new path points to an existing directory that is not empty', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.mkdir('/myotherdir', function(error) {
        if(error) throw error;

        fs.writeFile('/myotherdir/myfile', 'This is a file', function(error) {
          if(error) throw error;

          fs.rename('/mydir', '/myotherdir', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOTEMPTY');

            fs.stat('/mydir', function(error) {
              expect(error).not.to.exist;

              fs.stat('/myotherdir', function(error) {
                expect(error).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should fail to rename an existing directory if the new path points to an existing file', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.writeFile('/myfile', 'This is a file', function(error) {
        if(error) throw error;

        fs.rename('/mydir', '/myfile', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOTDIR');

          fs.stat('/mydir', function(error) {
            expect(error).not.to.exist;

            fs.stat('/myfile', function(error) {
              expect(error).not.to.exist;
              done();
            });
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],105:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.rmdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.rmdir).to.be.a('function');
  });

  it('should return an error if the path does not exist', function(done) {
    var fs = util.fs();

    fs.rmdir('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return an error if attempting to remove the root directory', function(done) {
    var fs = util.fs();

    fs.rmdir('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EBUSY");
      done();
    });
  });

  it('should return an error if the directory is not empty', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.mkdir('/tmp/mydir', function(error) {
        if(error) throw error;
        fs.rmdir('/', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal("EBUSY");
          done();
        });
      });
    });
  });

  it('should return an error if the path is not a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp/myfile', 'w', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error) {
          if(error) throw error;
          fs.rmdir('/tmp/myfile', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal("ENOTDIR");
            done();
          });
        });
      });
    });
  });

  it('should return an error if the path is a symbolic link', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function (error) {
      if(error) throw error;
      fs.symlink('/tmp', '/tmp/myfile', function (error) {
        if(error) throw error;
        fs.rmdir('/tmp/myfile', function (error) {
          expect(error).to.exist;
          expect(error.code).to.equal("ENOTDIR");
          done();
        });
      });
    });
  });

  it('should remove an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.rmdir('/tmp', function(error) {
        expect(error).not.to.exist;
        if(error) throw error;
        fs.stat('/tmp', function(error, stats) {
          expect(error).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],106:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe("fs.Shell", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it("is a function", function(done) {
    var fs = util.fs();
    expect(typeof fs.Shell).to.equal('function');

    done();
  });

  it('should return a FileSystemShell instance', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    expect(sh.prototype).to.deep.equal((new Filer.Shell(fs)).prototype);
    done();
  });

  it('should reflect changes to the prototype', function(done){
    var fs = util.fs();
    var sh = new fs.Shell();

    Filer.Shell.prototype.test = "foo";

    expect(sh.test).to.equal("foo");
    done();
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],107:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe("fs", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it("is an object", function() {
    var fs = util.fs();
    expect(typeof fs).to.equal('object');
    expect(fs).to.be.an.instanceof(Filer.FileSystem);
  });

  it('should have a root directory', function(done) {
    var fs = util.fs();
    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.type).to.equal('DIRECTORY');
      done();
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],108:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.stat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.stat).to.equal('function');
  });

  it('should return an error if path does not exist', function(done) {
    var fs = util.fs();

    fs.stat('/tmp', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return a stat object if path exists', function(done) {
    var fs = util.fs();

    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exit;

      expect(result['node']).to.be.a('string');
      expect(result['dev']).to.equal(fs.name);
      expect(result['size']).to.be.a('number');
      expect(result['nlinks']).to.be.a('number');
      expect(result['atime']).to.be.a('number');
      expect(result['mtime']).to.be.a('number');
      expect(result['ctime']).to.be.a('number');
      expect(result['type']).to.equal('DIRECTORY');

      done();
    });
  });

  it('should follow symbolic links and return a stat object for the resulting path', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;

            fs.stat('/myfilelink', function(error, result) {
              expect(error).not.to.exist;
              expect(result).to.exist;
              expect(result['node']).to.exist;
              done();
            });
          });
        });
      });
    });
  });

  it('should return a stat object for a valid descriptor', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.fstat(fd, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;

        expect(result['node']).to.exist;
        expect(result['dev']).to.equal(fs.name);
        expect(result['size']).to.be.a('number');
        expect(result['nlinks']).to.be.a('number');
        expect(result['atime']).to.be.a('number');
        expect(result['mtime']).to.be.a('number');
        expect(result['ctime']).to.be.a('number');
        expect(result['type']).to.equal('FILE');

        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],109:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.stats', function() {
  describe('#isFile()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFile).to.be.a('function');
      });
    });

    it('should return true if stats are for file', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.fstat(fd, function(error, stats) {
          expect(stats.isFile()).to.be.true;
          done();
        });
      });
    });

    it('should return false if stats are for directory', function(done) {
      var fs = util.fs();

      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFile()).to.be.false;
        done();
      });
    });

    it('should return false if stats are for symbolic link', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error, stats) {
          if(error) throw error;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;
            fs.lstat('/myfilelink', function(error, stats) {
              expect(stats.isFile()).to.be.false;
              done();
            });
          });
        });
      });
    });
  });

  describe('#isDirectory()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isDirectory).to.be.a('function');
      });
    });

    it('should return false if stats are for file', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.fstat(fd, function(error, stats) {
          expect(stats.isDirectory()).to.be.false;
          done();
        });
      });
    });

    it('should return true if stats are for directory', function(done) {
      var fs = util.fs();

      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });

    it('should return false if stats are for symbolic link', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error, stats) {
          if(error) throw error;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;
            fs.lstat('/myfilelink', function(error, stats) {
              expect(stats.isDirectory()).to.be.false;
              done();
            });
          });
        });
      });
    });
  });

  describe('#isBlockDevice()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isBlockDevice).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isBlockDevice()).to.be.false;
      });
    });
  });

  describe('#isCharacterDevice()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isCharacterDevice).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isCharacterDevice()).to.be.false;
      });
    });
  });

  describe('#isSymbolicLink()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSymbolicLink).to.be.a('function');
      });
    });

    it('should return false if stats are for file', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.fstat(fd, function(error, stats) {
          expect(stats.isSymbolicLink()).to.be.false;
          done();
        });
      });
    });

    it('should return false if stats are for directory', function(done) {
      var fs = util.fs();

      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSymbolicLink()).to.be.false;
        done();
      });
    });

    it('should return true if stats are for symbolic link', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error, stats) {
          if(error) throw error;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;
            fs.lstat('/myfilelink', function(error, stats) {
              expect(stats.isSymbolicLink()).to.be.true;
              done();
            });
          });
        });
      });
    });
  });

  describe('#isFIFO()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFIFO).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFIFO()).to.be.false;
      });
    });
  });

  describe('#isSocket()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSocket).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSocket()).to.be.false;
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],110:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.symlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.symlink).to.be.a('function');
  });

  it('should return an error if part of the parent destination path does not exist', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return an error if the destination path already exists', function(done) {
    var fs = util.fs();

    fs.symlink('/tmp', '/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EEXIST");
      done();
    });
  });

  it('should create a symlink', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myfile', function(error) {
      expect(error).not.to.exist;

      fs.stat('/myfile', function(err, stats) {
        expect(error).not.to.exist;
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],111:[function(require,module,exports){
(function (Buffer){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.truncate', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.truncate).to.be.a('function');
  });

  it('should error when length is negative', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;

      fs.truncate('/myfile', -1, function(error) {
        expect(error).to.exist;
        expect(error.code).to.equal("EINVAL");
        done();
      });
    });
  });

  it('should error when path is not a file', function(done) {
    var fs = util.fs();

    fs.truncate('/', 0, function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EISDIR");
      done();
    });
  });

  it('should truncate a file', function(done) {
    var fs = util.fs();
    var buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var truncated = new Buffer([1]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.truncate('/myfile', 1, function(error) {
            expect(error).not.to.exist;

            fs.readFile('/myfile', function(error, result) {
              if(error) throw error;

              expect(result).to.deep.equal(truncated);
              done();
            });
          });
        });
      });
    });
  });

  it('should pad a file with zeros when the length is greater than the file size', function(done) {
    var fs = util.fs();
    var buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var truncated = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 0]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.truncate('/myfile', 9, function(error) {
            expect(error).not.to.exist;

            fs.readFile('/myfile', function(error, result) {
              if(error) throw error;

              expect(result).to.deep.equal(truncated);
              done();
            });
          });
        });
      });
    });
  });

  it('should update the file size', function(done) {
    var fs = util.fs();
    var buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.truncate('/myfile', 0, function(error) {
            expect(error).not.to.exist;

            fs.stat('/myfile', function(error, result) {
              if(error) throw error;

              expect(result.size).to.equal(0);
              done();
            });
          });
        });
      });
    });
  });

  it('should truncate a valid descriptor', function(done) {
    var fs = util.fs();
    var buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.ftruncate(fd, 0, function(error) {
          expect(error).not.to.exist;

          fs.fstat(fd, function(error, result) {
            if(error) throw error;

            expect(result.size).to.equal(0);
            done();
          });
        });
      });
    });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();
    var buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.symlink('/myfile', '/mylink', function(error) {
            if(error) throw error;

            fs.truncate('/mylink', 0, function(error) {
              expect(error).not.to.exist;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(0);
                fs.lstat('/mylink', function(error, result) {
                  if(error) throw error;

                  expect(result.size).not.to.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});

}).call(this,require("buffer").Buffer)
},{"../..":59,"../lib/test-utils.js":87,"buffer":38,"chai":6}],112:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.unlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.unlink).to.be.a('function');
  });

  it('should remove a link to an existing file', function(done) {
    var fs = util.fs();
    var complete1, complete2;

    function maybeDone() {
      if(complete1 && complete2) {
        done();
      }
    }

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.link('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          fs.unlink('/myfile', function(error) {
            if(error) throw error;

            fs.stat('/myfile', function(error, result) {
              expect(error).to.exist;
              complete1 = true;
              maybeDone();
            });

            fs.stat('/myotherfile', function(error, result) {
              if(error) throw error;

              expect(result.nlinks).to.equal(1);
              complete2 = true;
              maybeDone();
            });
          });
        });
      });
    });
  });

  it('should not follow symbolic links', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myFileLink', function (error) {
      if (error) throw error;

      fs.link('/myFileLink', '/myotherfile', function (error) {
        if (error) throw error;

        fs.unlink('/myFileLink', function (error) {
          if (error) throw error;

          fs.lstat('/myFileLink', function (error, result) {
            expect(error).to.exist;

            fs.lstat('/myotherfile', function (error, result) {
              if (error) throw error;
              expect(result.nlinks).to.equal(1);

              fs.stat('/', function (error, result) {
                if (error) throw error;
                expect(result.nlinks).to.equal(1);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should not unlink directories', function (done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function (error) {
      if(error) throw error;

      fs.unlink('/mydir', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EPERM');

        fs.stat('/mydir', function (error, stats) {
          expect(error).not.to.exist;
          expect(stats).to.exist;
          expect(stats.type).to.equal('DIRECTORY');
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],113:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.utimes', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.utimes).to.be.a('function');
  });

  it('should error when atime is negative', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.utimes('/testfile', -1, Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when mtime is negative', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), -1, function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when atime is as invalid number', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', 'invalid datetime', Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when path does not exist', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.utimes('/pathdoesnotexist', atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should error when mtime is an invalid number', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), 'invalid datetime', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when file descriptor is invalid', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.futimes(1, atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      done();
    });
  });

  it('should change atime and mtime of a file path', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testfile', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtime).to.equal(mtime);
          done();
        });
      });
    });
  });

  it ('should change atime and mtime for a valid file descriptor', function(done) {
    var fs = util.fs();
    var ofd;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.open('/testfile', 'w', function (error, result) {
      if (error) throw error;

      ofd = result;
      fs.futimes(ofd, atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.fstat(ofd, function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtime).to.equal(mtime);
            done();
        });
      });
    });
  });

  it('should update atime and mtime of directory path', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.mkdir('/testdir', function (error) {
      if (error) throw error;

      fs.utimes('/testdir', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testdir', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtime).to.equal(mtime);
          done();
        });
      });
    });
  });

  it('should update atime and mtime using current time if arguments are null', function(done) {
    var fs = util.fs();
    var atimeEst;
    var mtimeEst;

    fs.writeFile('/myfile', '', function (error) {
      if (error) throw error;

      var then = Date.now();
      fs.utimes('/myfile', null, null, function (error) {
        expect(error).not.to.exist;

        fs.stat('/myfile', function (error, stat) {
          expect(error).not.to.exist;
          // Note: testing estimation as time may differ by a couple of milliseconds
          // This number should be increased if tests are on slow systems
          var delta = Date.now() - then;
          expect(then - stat.atime).to.be.at.most(delta);
          expect(then - stat.mtime).to.be.at.most(delta);
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],114:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.watch', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.watch).to.equal('function');
  });

  it('should get a change event when writing a file', function(done) {
    var fs = util.fs();

    var watcher = fs.watch('/myfile', function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal('/myfile');
      watcher.close();
      done();
    });

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    });
  });

  it('should get a change event when writing a file beneath root dir with recursive=true', function(done) {
    var fs = util.fs();

    var watcher = fs.watch('/', { recursive: true }, function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal('/');
      watcher.close();
      done();
    });

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    });
  });

  it('should get a change event when writing a file in a dir with recursive=true', function(done) {
    var fs = util.fs();

    fs.mkdir('/foo', function(err) {
      if(err) throw err;

      var watcher = fs.watch('/foo', { recursive: true }, function(event, filename) {
        expect(event).to.equal('change');
        expect(filename).to.equal('/foo');
        watcher.close();
        done();
      });

      // This shouldn't produce a change event
      fs.writeFile('/myfile-not-in-foo', 'data', function(error) {
        if(error) throw error;
      });

      // This should
      fs.writeFile('/foo/myfile', 'data', function(error) {
        if(error) throw error;
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],115:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.write', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.write).to.be.a('function');
  });

  it('should write data to a file', function(done) {
    var fs = util.fs();
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.equal(buffer.length);

        fs.stat('/myfile', function(error, result) {
          expect(error).not.to.exist;
          expect(result.type).to.equal('FILE');
          expect(result.size).to.equal(buffer.length);
          done();
        });
      });
    });
  });

  it('should update the current file position', function(done) {
    var fs = util.fs();
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var _result = 0;

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;
        _result += result;

        fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;
          _result += result;

          fs.stat('/myfile', function(error, result) {
            if(error) throw error;
            expect(error).not.to.exist;
            expect(_result).to.equal(2 * buffer.length);
            expect(result.size).to.equal(_result);
            done();
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],116:[function(require,module,exports){
(function (Buffer){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.writeFile, fs.readFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.writeFile).to.be.a('function');
    expect(fs.readFile).to.be.a('function');
  });

  it('should error when path is wrong to readFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.readFile('/no-such-file', 'utf8', function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(data).not.to.exist;
      done();
    });
  });

  it('should write, read a utf8 file without specifying utf8 in writeFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write, read a utf8 file with "utf8" option to writeFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', contents, 'utf8', function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write, read a utf8 file with {encoding: "utf8"} option to writeFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', contents, { encoding: 'utf8' }, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write, read a binary file', function(done) {
    var fs = util.fs();
    // String and utf8 binary encoded versions of the same thing:
    var contents = "This is a file.";
    var binary = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

    fs.writeFile('/myfile', binary, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.deep.equal(binary);
        done();
      });
    });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', '', { encoding: 'utf8' }, function(error) {
      if(error) throw error;
      fs.symlink('/myfile', '/myFileLink', function (error) {
        if (error) throw error;
        fs.writeFile('/myFileLink', contents, 'utf8', function (error) {
          if (error) throw error;
          fs.readFile('/myFileLink', 'utf8', function(error, data) {
            expect(error).not.to.exist;
            expect(data).to.equal(contents);
            done();
          });
        });
      });
    });
  });
});

}).call(this,require("buffer").Buffer)
},{"../..":59,"../lib/test-utils.js":87,"buffer":38,"chai":6}],117:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.xattr', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs();
    expect(fs.setxattr).to.be.a('function');
    expect(fs.getxattr).to.be.a('function');
    expect(fs.removexattr).to.be.a('function');
    expect(fs.fsetxattr).to.be.a('function');
    expect(fs.fgetxattr).to.be.a('function');
  });

  it('should error when setting with a name that is not a string', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 89, 'testvalue', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when setting with a name that is null', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', null, 'testvalue', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when setting with an invalid flag', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', 'InvalidFlag', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when when setting an extended attribute which exists with XATTR_CREATE flag', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', function(error) {
        if (error) throw error;

        fs.setxattr('/testfile', 'test', 'othervalue', 'CREATE', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('EEXIST');
          done();
        });
      });
    });
  });

  it('should error when setting an extended attribute which does not exist with XATTR_REPLACE flag', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', 'REPLACE', function(error) {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOATTR');
        done();
      });
    });
  });

  it('should error when getting an attribute with a name that is empty', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.getxattr('/testfile', '', function(error, value) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when getting an attribute where the name is not a string', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.getxattr('/testfile', 89, function(error, value) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when getting an attribute that does not exist', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.getxattr('/testfile', 'test', function(error, value) {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOATTR');
        done();
      });
    });
  });

  it('should error when file descriptor is invalid', function(done) {
    var fs = util.fs();
    var completeSet, completeGet, completeRemove;
    var _value;

    completeSet = completeGet = completeRemove = false;

    function maybeDone() {
      if(completeSet && completeGet && completeRemove) {
        done();
      }
    }

    fs.fsetxattr(1, 'test', 'value', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      completeSet = true;
      maybeDone();
    });

    fs.fgetxattr(1, 'test', function(error, value) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      expect(value).not.to.exist;
      completeGet = true;
      maybeDone();
    });

    fs.fremovexattr(1, 'test', function(error, value) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      completeRemove = true;
      maybeDone();
    });
  });

  it('should set and get an extended attribute of a path', function(done) {
    var fs = util.fs();
    var name = 'test';

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', name, 'somevalue', function(error) {
        expect(error).not.to.exist;

        fs.getxattr('/testfile', name, function(error, value) {
          expect(error).not.to.exist;
          expect(value).to.equal('somevalue');
          done();
        });
      });
    });
  });

  it('should error when attempting to remove a non-existing attribute', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', '', function (error) {
        if (error) throw error;

        fs.removexattr('/testfile', 'testenoattr', function (error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOATTR');
          done();
        });
      });
    });
  });

  it('should set and get an empty string as a value', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', '', function (error) {
        if(error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.equal('');
          done();
        });
      });
    });
  });

  it('should set and get an extended attribute for a valid file descriptor', function(done) {
    var fs = util.fs();

    fs.open('/testfile', 'w', function (error, ofd) {
      if (error) throw error;

      fs.fsetxattr(ofd, 'test', 'value', function (error) {
        expect(error).not.to.exist;

        fs.fgetxattr(ofd, 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.equal('value');
          done();
        });
      });
    });
  });

  it('should set and get an object to an extended attribute', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', { key1: 'test', key2: 'value', key3: 87 }, function (error) {
        if(error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.deep.equal({ key1: 'test', key2: 'value', key3: 87 });
          done();
        });
      });
    });
  });

  it('should update/overwrite an existing extended attribute', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          if (error) throw error;
          expect(value).to.equal('value');

          fs.setxattr('/testfile', 'test', { o: 'object', t: 'test' }, function (error) {
            if (error) throw error;

            fs.getxattr('/testfile', 'test', function (error, value) {
              if (error) throw error;
              expect(value).to.deep.equal({ o: 'object', t: 'test' });

              fs.setxattr('/testfile', 'test', 100, 'REPLACE', function (error) {
                if (error) throw error;

                fs.getxattr('/testfile', 'test', function (error, value) {
                  expect(value).to.equal(100);
                  done();
                });
              });
            });
          });
        });
      })
    });
  });

  it('should set multiple extended attributes for a path', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 89, function (error) {
        if (error) throw error;

        fs.setxattr('/testfile', 'other', 'attribute', function (error) {
          if(error) throw error;

          fs.getxattr('/testfile', 'test', function (error, value) {
            if(error) throw error;
            expect(value).to.equal(89);

            fs.getxattr('/testfile', 'other', function (error, value) {
              expect(error).not.to.exist;
              expect(value).to.equal('attribute');
              done();
            });
          });
        });
      });
    });
  });

  it('should remove an extended attribute from a path', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'somevalue', function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          if (error) throw error;
          expect(value).to.equal('somevalue');

          fs.removexattr('/testfile', 'test', function (error) {
            if (error) throw error;

            fs.getxattr('/testfile', 'test', function (error) {
              expect(error).to.exist;
              expect(error.code).to.equal('ENOATTR');
              done();
            });
          });
        });
      });
    });
  });

  it('should remove an extended attribute from a valid file descriptor', function(done) {
    var fs = util.fs();

    fs.open('/testfile', 'w', function (error, ofd) {
      if (error) throw error;

      fs.fsetxattr(ofd, 'test', 'somevalue', function (error) {
        if (error) throw error;

        fs.fgetxattr(ofd, 'test', function (error, value) {
          if (error) throw error;
          expect(value).to.equal('somevalue');

          fs.fremovexattr(ofd, 'test', function (error) {
            if (error) throw error;

            fs.fgetxattr(ofd, 'test', function (error) {
              expect(error).to.exist;
              expect(error.code).to.equal('ENOATTR');
              done();
            });
          });
        });
      });
    });
  });

  it('should allow setting with a null value', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', null, function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.be.null;
          done();
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],118:[function(require,module,exports){
var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  // Based on test1 from https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js
  it('should create a dir without a mode arg', function(done) {
    var pathname = '/test1';
    var fs = util.fs();

    fs.mkdir(pathname, function(error) {
      if(error) throw error;
      fs.stat(pathname, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('DIRECTORY');
        done();
      });
    });
  });

  // Based on test2 https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js
  it('should create a dir with a mode arg', function(done) {
    var pathname = '/test2';
    var fs = util.fs();

    fs.mkdir(pathname, 511 /*=0777*/, function(error) {
      if(error) throw error;
      fs.stat(pathname, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('DIRECTORY');
        done();
      });
    });
  });
});

},{"../../../..":59,"../../../lib/test-utils.js":87,"chai":6}],119:[function(require,module,exports){
var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-null-bytes.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should reject paths with null bytes in them', function(done) {
    var checks = [];
    var fnCount = 0;
    var fnTotal = 16;
    var expected = "Path must be a string without null bytes.";
    var fs = util.fs();

    // Make sure function fails with null path error in callback.
    function check(fn) {
      var args = Array.prototype.slice.call(arguments, 1);
      args = args.concat(function(err) {
        checks.push(function(){
          expect(err).to.exist;
          expect(err.message).to.equal(expected);
        });
        fnCount++;
        if(fnCount === fnTotal) {
          done();
        }
      });

      fn.apply(fs, args);
    }

    check(fs.link,        '/foo\u0000bar', 'foobar');
    check(fs.link,        '/foobar', 'foo\u0000bar');
    check(fs.lstat,       '/foo\u0000bar');
    check(fs.mkdir,       '/foo\u0000bar', '0755');
    check(fs.open,        '/foo\u0000bar', 'r');
    check(fs.readFile,    '/foo\u0000bar');
    check(fs.readdir,     '/foo\u0000bar');
    check(fs.readlink,    '/foo\u0000bar');
    check(fs.rename,      '/foo\u0000bar', 'foobar');
    check(fs.rename,      '/foobar', 'foo\u0000bar');
    check(fs.rmdir,       '/foo\u0000bar');
    check(fs.stat,        '/foo\u0000bar');
    check(fs.symlink,     '/foo\u0000bar', 'foobar');
    check(fs.symlink,     '/foobar', 'foo\u0000bar');
    check(fs.unlink,      '/foo\u0000bar');
    check(fs.writeFile,   '/foo\u0000bar');
    check(fs.appendFile,  '/foo\u0000bar');
    check(fs.truncate,    '/foo\u0000bar');
    check(fs.utimes,      '/foo\u0000bar', 0, 0);
    // TODO - need to be implemented still...
    //  check(fs.realpath,    '/foo\u0000bar');
    //  check(fs.chmod,       '/foo\u0000bar', '0644');
    //  check(fs.chown,       '/foo\u0000bar', 12, 34);
    //  check(fs.realpath,    '/foo\u0000bar');

    checks.forEach(function(fn){
      fn();
    });
  });
});

},{"../../../..":59,"../../../lib/test-utils.js":87,"chai":6}],120:[function(require,module,exports){
var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

/**
 * NOTE: unlike node.js, which either doesn't give filenames (e.g., in case of
 * fd vs. path) for events, or gives only a portion thereof (e.g., basname),
 * we give full, abs paths always.
 */
describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-watch-recursive.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should get change event for writeFile() under a recursive watched dir', function(done) {
    var fs = util.fs();

    fs.mkdir('/test', function(error) {
      if(error) throw error;

      fs.mkdir('/test/subdir', function(error) {
        if(error) throw error;

        var watcher = fs.watch('/test', {recursive: true});
        watcher.on('change', function(event, filename) {
          expect(event).to.equal('change');
          // Expect to see that a new file was created in /test/subdir
          expect(filename).to.equal('/test/subdir');
          watcher.close();
          done();
        });

        fs.writeFile('/test/subdir/watch.txt', 'world');
      });
    });
  });
});

},{"../../../..":59,"../../../lib/test-utils.js":87,"chai":6}],121:[function(require,module,exports){
var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

/**
 * NOTE: unlike node.js, which either doesn't give filenames (e.g., in case of
 * fd vs. path) for events, or gives only a portion thereof (e.g., basname),
 * we give full, abs paths always.
 */
var filenameOne = '/watch.txt';
var filenameTwo = '/hasOwnProperty';

describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-watch.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should get change event for writeFile() using FSWatcher object', function(done) {
    var fs = util.fs();
    var changes = 0;

    var watcher = fs.watch(filenameOne);
    watcher.on('change', function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal(filenameOne);

      // Make sure only one change event comes in (i.e., close() works)
      changes++;
      watcher.close();

      fs.writeFile(filenameOne, 'hello again', function(error) {
        expect(changes).to.equal(1);
        done();
      });
    });

    fs.writeFile(filenameOne, 'hello');
  });

  it('should get change event for writeFile() using fs.watch() only', function(done) {
    var fs = util.fs();
    var changes = 0;

    var watcher = fs.watch(filenameTwo, function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal(filenameTwo);

      watcher.close();
      done();
    });

    fs.writeFile(filenameTwo, 'pardner');
  });

  it('should allow watches on dirs', function(done) {
    var fs = util.fs();
    fs.mkdir('/tmp', function(error) {
      if(error) throw error;

      var watcher = fs.watch('/tmp', function(event, filename) {
// TODO: node thinks this should be 'rename', need to add rename along with change.
        expect(event).to.equal('change');
        expect(filename).to.equal('/tmp');
        watcher.close();
        done();
      });

      fs.open('/tmp/newfile.txt', 'w', function(error, fd) {
        if(error) throw error;
        fs.close(fd);
      });
    });
  });
});

},{"../../../..":59,"../../../lib/test-utils.js":87,"chai":6}],122:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('path resolution', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should follow a symbolic link to the root directory', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/mydirectorylink', function(error) {
      if(error) throw error;

      fs.stat('/', function(error, result) {
        if(error) throw error;

        expect(result['node']).to.exist;
        var _node = result['node'];

        fs.stat('/mydirectorylink', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.exist;
          expect(result['node']).to.equal(_node);
          done();
        });
      });
    });
  });

  it('should follow a symbolic link to a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      fs.symlink('/mydir', '/mydirectorylink', function(error) {
        if(error) throw error;

        fs.stat('/mydir', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          var _node = result['node'];
          fs.stat('/mydirectorylink', function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.exist;
            expect(result['node']).to.equal(_node);
            done();
          });
        });
      });
    });
  });

  it('should follow a symbolic link to a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          var _node = result['node'];
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;

            fs.stat('/myfilelink', function(error, result) {
              expect(error).not.to.exist;
              expect(result).to.exist;
              expect(result['node']).to.equal(_node);
              done();
            });
          });
        });
      });
    });
  });

  it('should follow multiple symbolic links to a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          var _node = result['node'];
          fs.symlink('/myfile', '/myfilelink1', function(error) {
            if(error) throw error;
            fs.symlink('/myfilelink1', '/myfilelink2', function(error) {
              if(error) throw error;

              fs.stat('/myfilelink2', function(error, result) {
                expect(error).not.to.exist;
                expect(result).to.exist;
                expect(result['node']).to.equal(_node);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should error if symbolic link leads to itself', function(done) {
    var fs = util.fs();

    fs.symlink('/mylink1', '/mylink2', function(error) {
      if(error) throw error;

      fs.symlink('/mylink2', '/mylink1', function(error) {
        if(error) throw error;

        fs.stat('/myfilelink1', function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal("ENOENT");
          expect(result).not.to.exist;
          done();
        });
      });
    });
  });

  it('should error if it follows more than 10 symbolic links', function(done) {
    var fs = util.fs();
    var nlinks = 11;

    function createSymlinkChain(n, callback) {
      if(n > nlinks) {
        return callback();
      }

      fs.symlink('/myfile' + (n-1), '/myfile' + n, createSymlinkChain.bind(this, n+1, callback));
    }

    fs.open('/myfile0', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile0', function(error, result) {
          if(error) throw error;

          createSymlinkChain(1, function() {
            fs.stat('/myfile11', function(error, result) {
              expect(error).to.exist;
              expect(error.code).to.equal('ELOOP');
              expect(result).not.to.exist;
              done();
            });
          });

        });
      });
    });
  });

  it('should follow a symbolic link in the path to a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          var _node = result['node'];
          fs.symlink('/', '/mydirlink', function(error) {
            if(error) throw error;

            fs.stat('/mydirlink/myfile', function(error, result) {
              expect(result).to.exist;
              expect(error).not.to.exist;
              expect(_node).to.exist;
              expect(result['node']).to.equal(_node);
              done();
            });
          });
        });
      });
    });
  });

  it('should error if a symbolic link in the path to a file is itself a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          fs.open('/myfile2', 'w', function(error, result) {
            if(error) throw error;
            var fd = result;
            fs.close(fd, function(error) {
              if(error) throw error;
              fs.symlink('/myfile2', '/mynotdirlink', function(error) {
                if(error) throw error;

                fs.stat('/mynotdirlink/myfile', function(error, result) {
                  expect(error).to.exist;
                  expect(error.code).to.equal("ENOTDIR");
                  expect(result).not.to.exist;
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should properly add trailing slashes with Path.addTrailing()', function() {
    var Path = Filer.Path;
    expect(Path.addTrailing('/')).to.equal('/');
    expect(Path.addTrailing('/////')).to.equal('/');
    expect(Path.addTrailing('.')).to.equal('./');
    expect(Path.addTrailing('/dir')).to.equal('/dir/');
    expect(Path.addTrailing('/dir/')).to.equal('/dir/');
  });

  it('should properly remove trailing slashes with Path.removeTrailing()', function() {
    var Path = Filer.Path;
    expect(Path.removeTrailing('/')).to.equal('/');
    expect(Path.removeTrailing('/////')).to.equal('/');
    expect(Path.removeTrailing('./')).to.equal('.');
    expect(Path.removeTrailing('/dir/')).to.equal('/dir');
    expect(Path.removeTrailing('/dir//')).to.equal('/dir');
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],123:[function(require,module,exports){
var Buffer = require('../../..').Buffer;
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

/**
 * Due to the different setup/cleanup needs of the built-in providers,
 * we use the test provider wrappers instead of the raw providers themselves.
 */
module.exports = function createProviderTestsFor(providerName, testProvider) {
  if(!testProvider.isSupported()) {
    console.log("Skipping provider tests for `" + providerName +"'--not supported in current environment.");
    return;
  }

  describe("Filer Provider Tests for " + providerName, function() {
    var _provider;
    var provider;

    beforeEach(function() {
      _provider = new testProvider(util.uniqueName());
      _provider.init();
      provider = _provider.provider;
    });

    afterEach(function(done) {
      _provider.cleanup(done);
      _provider = null;
      provider = null;
    });


    it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
      expect(provider.open).to.be.a('function');
      expect(provider.getReadOnlyContext).to.be.a('function');
      expect(provider.getReadWriteContext).to.be.a('function');
    });

    it("should open a new provider database", function(done) {
      provider.open(function(error) {
        expect(error).not.to.exist;
        done();
      });
    });

    it("should allow putObject() and getObject()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        // Simple JS Object
        var value = {
          a: "a",
          b: 1,
          c: true,
          d: [1,2,3],
          e: {
            e1: ['a', 'b', 'c']
          }
        };
        context.putObject("key", value, function(error) {
          if(error) throw error;

          context.getObject("key", function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.be.an('object');
            expect(result).to.deep.equal(value);
            done();
          });
        });
      });
    });

    it("should allow putBuffer() and getBuffer()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        // Filer Buffer
        var buf = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        context.putBuffer("key", buf, function(error) {
          if(error) throw error;

          context.getBuffer("key", function(error, result) {
            expect(error).not.to.exist;
            expect(Buffer.isBuffer(result)).to.be.true;
            expect(result).to.deep.equal(buf);
            done();
          });
        });
      });
    });

    it("should allow zero-length Buffers with putBuffer() and getBuffer()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        // Zero-length Filer Buffer
        var buf = new Buffer(new ArrayBuffer(0));
        context.putBuffer("key", buf, function(error) {
          if(error) throw error;

          context.getBuffer("key", function(error, result) {
            expect(error).not.to.exist;
            expect(Buffer.isBuffer(result)).to.be.true;
            expect(result).to.deep.equal(buf);
            done();
          });
        });
      });
    });

    it("should allow delete()", function(done) {
      var provider = _provider.provider;
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        context.putObject("key", "value", function(error) {
          if(error) throw error;

          context.delete("key", function(error) {
            if(error) throw error;

            context.getObject("key", function(error, result) {
              expect(error).not.to.exist;
              expect(result).not.to.exist;
              done();
            });
          });
        });
      });
    });

    it("should allow clear()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        context.putObject("key1", "value1", function(error) {
          if(error) throw error;

          context.putObject("key2", "value2", function(error) {
            if(error) throw error;

            context.clear(function(err) {
              if(error) throw error;

              context.getObject("key1", function(error, result) {
                if(error) throw error;
                expect(result).not.to.exist;

                context.getObject("key2", function(error, result) {
                  if(error) throw error;
                  expect(result).not.to.exist;
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
};

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],124:[function(require,module,exports){
var util = require('../../lib/test-utils.js');
var providerBase = require('./providers.base.js');

providerBase('IndexedDB', util.providers.IndexedDB);

},{"../../lib/test-utils.js":87,"./providers.base.js":123}],125:[function(require,module,exports){
var util = require('../../lib/test-utils.js');
var providerBase = require('./providers.base.js');

providerBase('Memory', util.providers.Memory);

},{"../../lib/test-utils.js":87,"./providers.base.js":123}],126:[function(require,module,exports){
var Filer = require('../../..');
var expect = require('chai').expect;

describe("Filer.FileSystem.providers", function() {
  it("is defined", function() {
    expect(Filer.FileSystem.providers).to.exist;
  });

  it("has IndexedDB constructor", function() {
    expect(Filer.FileSystem.providers.IndexedDB).to.be.a('function');
  });

  it("has WebSQL constructor", function() {
    expect(Filer.FileSystem.providers.WebSQL).to.be.a('function');
  });

  it("has Memory constructor", function() {
    expect(Filer.FileSystem.providers.Memory).to.be.a('function');
  });

  it("has a Default constructor", function() {
    expect(Filer.FileSystem.providers.Default).to.be.a('function');
  });

  it("has Fallback constructor", function() {
    expect(Filer.FileSystem.providers.Fallback).to.be.a('function');
  });
});

},{"../../..":59,"chai":6}],127:[function(require,module,exports){
var util = require('../../lib/test-utils.js');
var providerBase = require('./providers.base.js');

providerBase('WebSQL', util.providers.WebSQL);

},{"../../lib/test-utils.js":87,"./providers.base.js":123}],128:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.cat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.cat).to.be.a('function');
  });

  it('should fail when files argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.cat(null, function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(data).not.to.exist;
      done();
    });
  });

  it('should return the contents of a single file', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      shell.cat('/file', function(err, data) {
        expect(err).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should return the contents of multiple files', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        shell.cat(['/file', '/file2'], function(err, data) {
          expect(err).not.to.exist;
          expect(data).to.equal(contents + '\n' + contents2);
          done();
        });
      });
    });
  });

  it('should fail if any of multiple file paths is invalid', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        shell.cat(['/file', '/nofile'], function(err, data) {
          expect(err).to.exist;
          expect(err.code).to.equal("ENOENT");
          expect(data).not.to.exist;
          done();
        });
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],129:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.cd', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.cd).to.be.a('function');
  });

  it('should default to a cwd of /', function() {
    var shell = util.shell();
    expect(shell.pwd()).to.equal('/');
  });

  it('should allow changing the path to a valid dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('/dir', function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/dir');
        done();
      });
    });
  });

  it('should fail when changing the path to an invalid dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('/nodir', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        expect(shell.pwd()).to.equal('/');
        done();
      });
    });
  });

  it('should fail when changing the path to a file', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.writeFile('/file', 'file', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('/file', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        expect(shell.pwd()).to.equal('/');
        done();
      });
    });
  });

  it('should allow relative paths for a valid dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('./dir', function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/dir');
        done();
      });
    });
  });

  it('should allow .. in paths for a valid dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('./dir', function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/dir');
        shell.cd('..', function(err) {
          expect(err).not.to.exist;
          expect(shell.pwd()).to.equal('/');
          done();
        });
      });
    });
  });

  it('should follow symlinks to dirs', function(done) {
    var fs = util.fs();

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.symlink('/dir', '/link', function(error) {
        if(error) throw error;

        var shell = new fs.Shell();
        shell.cd('link', function(error) {
          expect(error).not.to.exist;
          expect(shell.pwd()).to.equal('/link');
          done();
        });
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],130:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.env', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should get default env options', function() {
    var shell = util.shell();
    expect(shell.env).to.exist;
    expect(shell.env.get('TMP')).to.equal('/tmp');
    expect(shell.env.get('PATH')).to.equal('');
    expect(shell.pwd()).to.equal('/');
  });

  it('should be able to specify env options', function() {
    var options = {
      env: {
        TMP: '/tempdir',
        PATH: '/dir'
      }
    };
    var shell = util.shell(options);
    expect(shell.env).to.exist;
    expect(shell.env.get('TMP')).to.equal('/tempdir');
    expect(shell.env.get('PATH')).to.equal('/dir');
    expect(shell.pwd()).to.equal('/');

    expect(shell.env.get('FOO')).not.to.exist;
    shell.env.set('FOO', 1);
    expect(shell.env.get('FOO')).to.equal(1);
  });

  it('should fail when dirs argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.cat(null, function(error, list) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(list).not.to.exist;
      done();
    });
  });

  it('should give new value for shell.pwd() when cwd changes', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('/dir', function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/dir');
        done();
      });
    });
  });

  it('should create/return the default tmp dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    expect(shell.env.get('TMP')).to.equal('/tmp');
    shell.tempDir(function(err, tmp) {
      expect(err).not.to.exist;
      shell.cd(tmp, function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/tmp');
        done();
      });
    });
  });

  it('should create/return the tmp dir specified in env.TMP', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell({
      env: {
        TMP: '/tempdir'
      }
    });

    expect(shell.env.get('TMP')).to.equal('/tempdir');
    shell.tempDir(function(err, tmp) {
      expect(err).not.to.exist;
      shell.cd(tmp, function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/tempdir');
        done();
      });
    });
  });

  it('should allow repeated calls to tempDir()', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    expect(shell.env.get('TMP')).to.equal('/tmp');
    shell.tempDir(function(err, tmp) {
      expect(err).not.to.exist;
      expect(tmp).to.equal('/tmp');

      shell.tempDir(function(err, tmp) {
        expect(err).not.to.exist;
        expect(tmp).to.equal('/tmp');
        done();
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],131:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.exec', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.exec).to.be.a('function');
  });

  it('should be able to execute a command .js file from the filesystem', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var cmdString = "fs.writeFile(args[0], args[1], callback);";

    fs.writeFile('/cmd.js', cmdString, function(error) {
      if(error) throw error;

      shell.exec('/cmd.js', ['/test', 'hello world'], function(error, result) {
        if(error) throw error;

        fs.readFile('/test', 'utf8', function(error, data) {
          if(error) throw error;
          expect(data).to.equal('hello world');
          done();
        });
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],132:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.find', function() {
  beforeEach(function(done) {
    util.setup(function() {
      var fs = util.fs();
      /**
       * Create a basic fs layout for each test:
       *
       * /
       * --file1
       * --file2
       * --dir1/
       *   --file3
       *   --subdir1/
       * --dir2/
       *   --file4
       */
      fs.writeFile('/file1', 'file1', function(err) {
        if(err) throw err;

        fs.writeFile('/file2', 'file2', function(err) {
          if(err) throw err;

          fs.mkdir('/dir1', function(err) {
            if(err) throw err;

            fs.writeFile('/dir1/file3', 'file3', function(err) {
              if(err) throw err;

              fs.mkdir('/dir1/subdir1', function(err) {
                if(err) throw err;

                fs.mkdir('/dir2', function(err) {
                  if(err) throw err;

                  fs.writeFile('/dir2/file4', 'file4', function(err) {
                    if(err) throw err;

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.find).to.be.a('function');
  });

  it('should fail when path does not exist', function(done) {
    var shell = util.shell();

    shell.find('/no-such-folder', function(err, found) {
      expect(err).to.exist;
      expect(err.code).to.equal('ENOENT');
      expect(found).not.to.exist;
      done();
    });
  });

  it('should fail when path exists but is non-dir', function(done) {
    var shell = util.shell();

    shell.find('/file1', function(err, found) {
      expect(err).to.exist;
      expect(err.code).to.equal('ENOTDIR');
      expect(found).not.to.exist;
      done();
    });
  });

  it('should find all paths in the filesystem with no options', function(done) {
    var shell = util.shell();

    shell.find('/', function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/',
        '/file1',
        '/file2',
        '/dir1/',
        '/dir1/file3',
        '/dir1/subdir1/',
        '/dir2/',
        '/dir2/file4'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });
  });

  it('should get same paths in exec as are found when complete', function(done) {
    var shell = util.shell();
    var pathsSeen = [];

    function processPath(path, next) {
      pathsSeen.push(path);
      next();
    }

    shell.find('/', {exec: processPath}, function(err, found) {
      expect(err).not.to.exist;

      expect(found).to.deep.equal(pathsSeen);
      done();
    });
  });

  it('should return only paths that match a regex pattern', function(done) {
    var shell = util.shell();

    shell.find('/', {regex: /file\d$/}, function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/file1',
        '/file2',
        '/dir1/file3',
        '/dir2/file4'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });    
  });

  it('should append a / to the end of a dir path', function(done) {
    var shell = util.shell();
    var dirsSeen = 0;

    function endsWith(str, suffix) {
      var lastIndex = str.lastIndexOf(suffix);
      return (lastIndex !== -1) && (lastIndex + suffix.length === str.length);
    }

    function processPath(path, next) {
      expect(endsWith(path, '/')).to.be.true;
      dirsSeen++;
      next();
    }

    shell.find('/', {regex: /dir\d$/, exec: processPath}, function(err) {
      expect(err).not.to.exist;
      expect(dirsSeen).to.equal(3);
      done();
    });    
  });

  it('should only look below the specified dir path', function(done) {
    var shell = util.shell();

    shell.find('/dir1', function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/dir1/',
        '/dir1/file3',
        '/dir1/subdir1/'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });    
  });

  it('should allow using options.name to match basename with a pattern', function(done) {
    var shell = util.shell();

    shell.find('/', {name: 'file*'}, function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/file1',
        '/file2',
        '/dir1/file3',
        '/dir2/file4'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });
  });

  it('should allow using options.path to match dirname with a pattern', function(done) {
    var shell = util.shell();

    shell.find('/', {name: '*ir1*'}, function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/dir1/',
        '/dir1/subdir1/'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });
  });

});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],133:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.ls', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.ls).to.be.a('function');
  });

  it('should fail when dirs argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.cat(null, function(error, list) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(list).not.to.exist;
      done();
    });
  });

  it('should return the contents of a simple dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";
    var contents2 = "bb";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        shell.ls('/', function(err, list) {
          expect(err).not.to.exist;
          expect(list.length).to.equal(2);

          var item0 = list[0];
          expect(item0.path).to.equal('file');
          expect(item0.links).to.equal(1);
          expect(item0.size).to.equal(1);
          expect(item0.modified).to.be.a('number');
          expect(item0.type).to.equal('FILE');
          expect(item0.contents).not.to.exist;

          var item1 = list[1];
          expect(item1.path).to.equal('file2');
          expect(item1.links).to.equal(1);
          expect(item1.size).to.equal(2);
          expect(item1.modified).to.be.a('number');
          expect(item1.type).to.equal('FILE');
          expect(item0.contents).not.to.exist;

          done();
        });
      });
    });
  });

  it('should return the shallow contents of a dir tree', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.mkdir('/dir/dir2', function(err) {
        if(err) throw err;

        fs.writeFile('/dir/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir/file2', contents, function(err) {
            if(err) throw err;

            shell.ls('/dir', function(err, list) {
              expect(err).not.to.exist;
              expect(list.length).to.equal(3);

              // We shouldn't rely on the order we'll get the listing
              list.forEach(function(item, i, arr) {
                switch(item.path) {
                case 'dir2':
                  expect(item.links).to.equal(1);
                  expect(item.size).to.be.a('number');
                  expect(item.modified).to.be.a('number');
                  expect(item.type).to.equal('DIRECTORY');
                  expect(item.contents).not.to.exist;
                  break;
                case 'file':
                case 'file2':
                  expect(item.links).to.equal(1);
                  expect(item.size).to.equal(1);
                  expect(item.modified).to.be.a('number');
                  expect(item.type).to.equal('FILE');
                  expect(item.contents).not.to.exist;
                  break;
                default:
                  // shouldn't happen
                  expect(true).to.be.false;
                  break;
                }

                if(i === arr.length -1) {
                  done();
                }
              });
            });
          });
        });
      });
    });
  });

  it('should return the deep contents of a dir tree', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.mkdir('/dir/dir2', function(err) {
        if(err) throw err;

        fs.writeFile('/dir/dir2/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir/file', contents, function(err) {
            if(err) throw err;

            fs.writeFile('/dir/file2', contents, function(err) {
              if(err) throw err;

              shell.ls('/dir', { recursive: true }, function(err, list) {
                expect(err).not.to.exist;
                expect(list.length).to.equal(3);

                // We shouldn't rely on the order we'll get the listing
                list.forEach(function(item, i, arr) {
                  switch(item.path) {
                  case 'dir2':
                    expect(item.links).to.equal(1);
                    expect(item.size).to.be.a('number');
                    expect(item.modified).to.be.a('number');
                    expect(item.type).to.equal('DIRECTORY');
                    expect(item.contents).to.exist;
                    expect(item.contents.length).to.equal(1);
                    var contents0 = item.contents[0];
                    expect(contents0.path).to.equal('file');
                    expect(contents0.links).to.equal(1);
                    expect(contents0.size).to.equal(1);
                    expect(contents0.modified).to.be.a('number');
                    expect(contents0.type).to.equal('FILE');
                    expect(contents0.contents).not.to.exist;
                    break;
                  case 'file':
                  case 'file2':
                    expect(item.links).to.equal(1);
                    expect(item.size).to.equal(1);
                    expect(item.modified).to.be.a('number');
                    expect(item.type).to.equal('FILE');
                    expect(item.contents).not.to.exist;
                    break;
                  default:
                    // shouldn't happen
                    expect(true).to.be.false;
                    break;
                  }

                  if(i === arr.length -1) {
                    done();
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],134:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.mkdirp', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.mkdirp).to.be.a('function');
  });

  it('should fail without a path provided', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.mkdirp(null, function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });

  it('should succeed if provided path is root', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    shell.mkdirp('/', function(err) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('should succeed if the directory exists', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    fs.mkdir('/test', function(err){
      expect(err).to.not.exist;
      shell.mkdirp('/test',function(err) {
        expect(err).to.not.exist;
        done();
      });
    });
  });

  it('fail if a file name is provided', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    fs.writeFile('/test.txt', 'test', function(err){
      expect(err).to.not.exist;
      shell.mkdirp('/test.txt', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        done();
      });
    });
  });

  it('should succeed on a folder on root (\'/test\')', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    shell.mkdirp('/test', function(err) {
      expect(err).to.not.exist;
      fs.exists('/test', function(dir){
        expect(dir).to.be.true;
        done();
      });
    });
  });

  it('should succeed on a folder with a nonexistant parent (\'/test/test\')', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    shell.mkdirp('/test/test', function(err) {
      expect(err).to.not.exist;
      fs.exists('/test', function(dir1){
        expect(dir1).to.be.true;
        fs.exists('/test/test', function(dir2){
          expect(dir2).to.be.true;
          done();
        });
      });
    });
  });

  it('should fail on a folder with a file for its parent (\'/test.txt/test\')', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    fs.writeFile('/test.txt', 'test', function(err){
      expect(err).to.not.exist;
      shell.mkdirp('/test.txt/test', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        done();
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],135:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.rm', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.rm).to.be.a('function');
  });

  it('should fail when path argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.rm(null, function(error, list) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(list).not.to.exist;
      done();
    });
  });

  it('should remove a single file', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      shell.rm('/file', function(err) {
        expect(err).not.to.exist;

        fs.stat('/file', function(err, stats) {
          expect(err).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });

  it('should remove an empty dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      shell.rm('/dir', function(err) {
        expect(err).not.to.exist;

        fs.stat('/dir', function(err, stats) {
          expect(err).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });

  it('should fail to remove a non-empty dir', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      shell.touch('/dir/file', function(err) {
        if(err) throw err;

        shell.rm('/dir', function(err) {
          expect(err).to.exist;
          expect(err.code).to.equal('ENOTEMPTY');
          done();
        });
      });
    });
  });

  it('should remove a non-empty dir with option.recursive set', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      shell.touch('/dir/file', function(err) {
        if(err) throw err;

        shell.rm('/dir', { recursive: true }, function(err) {
          expect(err).not.to.exist;

          fs.stat('/dir', function(err, stats) {
            expect(err).to.exist;
            expect(stats).not.to.exist;
            done();
          });
        });
      });
    });
  });

  it('should work on a complex dir structure', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.mkdir('/dir/dir2', function(err) {
        if(err) throw err;

        fs.writeFile('/dir/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir/file2', contents, function(err) {
            if(err) throw err;

            shell.rm('/dir', { recursive: true }, function(err) {
              expect(err).not.to.exist;

              fs.stat('/dir', function(err, stats) {
                expect(err).to.exist;
                expect(stats).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],136:[function(require,module,exports){
var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

function getTimes(fs, path, callback) {
  fs.stat(path, function(error, stats) {
    if(error) throw error;
    callback({mtime: stats.mtime, atime: stats.atime});
  });
}

describe('FileSystemShell.touch', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.touch).to.be.a('function');
  });

  it('should create a new file if path does not exist', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.touch('/newfile', function(error) {
      if(error) throw error;

      fs.stat('/newfile', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats.type).to.equal('FILE');
        done();
      });
    });
  });

  it('should skip creating a new file if options.updateOnly is true', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.touch('/newfile', { updateOnly: true }, function(error) {
      if(error) throw error;

      fs.stat('/newfile', function(error, stats) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should update times if path does exist', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.open('/newfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.futimes(fd, atime, mtime, function (error) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          getTimes(fs, '/newfile', function(times1) {
            shell.touch('/newfile', function(error) {
              expect(error).not.to.exist;

              getTimes(fs, '/newfile', function(times2) {
                expect(times2.mtime).to.be.above(times1.mtime);
                expect(times2.atime).to.be.above(times1.atime);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update times to specified date if path does exist', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var date = Date.parse('1 Oct 2001 15:33:22');

    fs.open('/newfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        shell.touch('/newfile', { date: date }, function(error) {
          expect(error).not.to.exist;

          getTimes(fs, '/newfile', function(times) {
            expect(times.mtime).to.equal(date);
            done();
          });
        });
      });
    });
  });
});

},{"../../..":59,"../../lib/test-utils.js":87,"chai":6}],137:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('node times (atime, mtime, ctime) with mount flags', function() {

  var dirname = "/dir";
  var filename = "/dir/file";

  function memoryFS(flags, callback) {
    var name = util.uniqueName();
    var fs = new Filer.FileSystem({
      name: name,
      flags: flags || [],
      provider: new Filer.FileSystem.providers.Memory(name)
    }, callback);
  }

  function createTree(fs, callback) {
    fs.mkdir(dirname, function(error) {
      if(error) throw error;

      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.close(fd, callback);
      });
    });
  }

  function stat(fs, path, callback) {
    fs.stat(path, function(error, stats) {
      if(error) throw error;

      callback(stats);
    });
  }

  /**
   * We test the actual time updates in times.spec.js, whereas these just test
   * the overrides with the mount flags.  The particular fs methods called
   * are unimportant, but are known to affect the particular times being suppressed.
   */

  it('should not update ctime when calling fs.rename() with NOCTIME', function(done) {
    memoryFS(['NOCTIME'], function(error, fs) {
      var newfilename = filename + '1';

      createTree(fs, function() {
        stat(fs, filename, function(stats1) {

          fs.rename(filename, newfilename, function(error) {
            if(error) throw error;

            stat(fs, newfilename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should not update ctime, mtime, atime when calling fs.truncate() with NOCTIME, NOMTIME', function(done) {
    memoryFS(['NOCTIME', 'NOMTIME'], function(error, fs) {
      createTree(fs, function() {
        stat(fs, filename, function(stats1) {

          fs.truncate(filename, 5, function(error) {
            if(error) throw error;

            stat(fs, filename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should not update mtime when calling fs.truncate() with NOMTIME', function(done) {
    memoryFS(['NOMTIME'], function(error, fs) {
      createTree(fs, function() {
        stat(fs, filename, function(stats1) {

          fs.truncate(filename, 5, function(error) {
            if(error) throw error;

            stat(fs, filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],138:[function(require,module,exports){
var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('node times (atime, mtime, ctime)', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  var dirname = "/dir";
  var filename = "/dir/file";

  function createTree(callback) {
    var fs = util.fs();
    fs.mkdir(dirname, function(error) {
      if(error) throw error;

      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.close(fd, callback);
      });
    });
  }

  function stat(path, callback) {
    var fs = util.fs();
    fs.stat(path, function(error, stats) {
      if(error) throw error;

      callback(stats);
    });
  }

  it('should update ctime when calling fs.rename()', function(done) {
    var fs = util.fs();
    var newfilename = filename + '1';

    createTree(function() {
      stat(filename, function(stats1) {

        fs.rename(filename, newfilename, function(error) {
          if(error) throw error;

          stat(newfilename, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, mtime, atime when calling fs.truncate()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.truncate(filename, 5, function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.be.at.least(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, mtime, atime when calling fs.ftruncate()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.ftruncate(fd, 5, function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);

              fs.close(fd, done);
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.stat()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.stat(filename, function(error, stats2) {
          if(error) throw error;

          expect(stats2.ctime).to.equal(stats1.ctime);
          expect(stats2.mtime).to.equal(stats1.mtime);
          expect(stats2.atime).to.equal(stats1.atime);
          done();
        });
      });
    });
  });

  it('should make no change when calling fs.fstat()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.fstat(fd, function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);

            fs.close(fd, done);
          });
        });
      });
    });
  });

  it('should make no change when calling fs.lstat()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.link(filename, '/link', function(error) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.lstat('/link', function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.exists()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.exists(filename, function(exists) {
          expect(exists).to.be.true;

          fs.stat(filename, function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.link()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.link(filename, '/link', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.symlink()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.symlink(filename, '/link', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.readlink()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.symlink(filename, '/link', function(error) {
        if(error) throw error;

        stat('/link', function(stats1) {
          fs.readlink('/link', function(error, contents) {
            if(error) throw error;
            expect(contents).to.equal(filename);

            stat('/link', function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime, mtime of parent dir when calling fs.unlink()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(dirname, function(stats1) {
        fs.unlink(filename, function(error) {
          if(error) throw error;

          stat(dirname, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.be.at.least(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime, mtime of parent dir when calling fs.rmdir()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat('/', function(stats1) {

        fs.unlink(filename, function(error) {
          if(error) throw error;

          fs.rmdir(dirname, function(error) {
            if(error) throw error;

            stat('/', function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime, mtime of parent dir when calling fs.mkdir()', function(done) {
      var fs = util.fs();

    createTree(function() {
      stat('/', function(stats1) {

        fs.mkdir('/a', function(error) {
          if(error) throw error;

          stat('/', function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.be.at.least(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.close()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.close(fd, function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.open()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);

            fs.close(fd, done);
          });
        });
      });
    });
  });

  /**
   * fs.utimes and fs.futimes are tested elsewhere already, skipping
   */

  it('should update atime, ctime, mtime when calling fs.write()', function(done) {
    var fs = util.fs();
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    createTree(function() {
      fs.open('/myfile', 'w', function(error, fd) {
        if(error) throw error;

        stat('/myfile', function(stats1) {
          fs.write(fd, buffer, 0, buffer.length, 0, function(error, nbytes) {
            if(error) throw error;

            fs.close(fd, function(error) {
              if(error) throw error;

              stat('/myfile', function(stats2) {
                expect(stats2.ctime).to.be.at.least(stats1.ctime);
                expect(stats2.mtime).to.be.at.least(stats1.mtime);
                expect(stats2.atime).to.be.at.least(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.read()', function(done) {
    var fs = util.fs();
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    createTree(function() {
      fs.open('/myfile', 'w', function(err, fd) {
        if(err) throw err;

        fs.write(fd, buffer, 0, buffer.length, 0, function(err, nbytes) {
          if(err) throw err;

          fs.close(fd, function(error) {
            if(error) throw error;

            fs.open('/myfile', 'r', function(error, fd) {
              if(error) throw error;

              stat('/myfile', function(stats1) {
                var buffer2 = new Filer.Buffer(buffer.length);
                buffer2.fill(0);
                fs.read(fd, buffer2, 0, buffer2.length, 0, function(err, nbytes) {

                  fs.close(fd, function(error) {
                    if(error) throw error;

                    stat('/myfile', function(stats2) {
                      expect(stats2.ctime).to.equal(stats1.ctime);
                      expect(stats2.mtime).to.equal(stats1.mtime);
                      expect(stats2.atime).to.equal(stats1.atime);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.readFile()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.readFile(filename, function(error, data) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update atime, ctime, mtime when calling fs.writeFile()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.writeFile(filename, 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.be.at.least(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update atime, ctime, mtime when calling fs.appendFile()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.appendFile(filename, '...more data', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.be.at.least(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.setxattr()', function(done) {
    var fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.setxattr(filename, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctime).to.be.at.least(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.be.at.least(stats1.atime);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.fsetxattr()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.fsetxattr(fd, 'extra', 'data', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.getxattr()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.setxattr(filename, 'extra', 'data', function(error) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.getxattr(filename, 'extra', function(error, value) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.fgetxattr()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.fsetxattr(fd, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.fgetxattr(fd, 'extra', function(error, value) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.equal(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.equal(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.removexattr()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.setxattr(filename, 'extra', 'data', function(error) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.removexattr(filename, 'extra', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.fremovexattr()', function(done) {
    var fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.fsetxattr(fd, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.fremovexattr(fd, 'extra', function(error) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.be.at.least(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.be.at.least(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });
  });
});

},{"../..":59,"../lib/test-utils.js":87,"chai":6}],139:[function(require,module,exports){
var Path = require('../..').Path;
var expect = require('chai').expect;

describe('Path.normalize and trailing slashes', function() {

  it('should remove trailing slashes as expected', function() {
    var strip = Path.normalize;

    expect(strip('/')).to.equal('/');
    expect(strip('/foo/')).to.equal('/foo');
    expect(strip('/foo//')).to.equal('/foo');
    expect(strip('/foo/bar/baz/')).to.equal('/foo/bar/baz');
  });

});

},{"../..":59,"chai":6}]},{},[84]);
