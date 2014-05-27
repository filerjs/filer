var EventEmitter = require('../lib/eventemitter.js');
var isNullPath = require('./path.js').isNull;
var Intercom = require('../lib/intercom.js');

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

module.exports = FSWatcher;
