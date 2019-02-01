'using strict';

const EventEmitter = require('../lib/eventemitter.js');
const Path = require('./path.js');
const Intercom = require('../lib/intercom.js');

/**
 * FSWatcher based on node.js' FSWatcher
 * see https://github.com/joyent/node/blob/master/lib/fs.js
 */
function FSWatcher() {
  EventEmitter.call(this);
  const self = this;
  let recursive = false;
  let recursivePathPrefix;
  let filename;

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

    const intercom = Intercom.getInstance();
    intercom.on('change', onchange);
  };

  self.close = function() {
    const intercom = Intercom.getInstance();
    intercom.off('change', onchange);
    self.removeAllListeners('change');
  };
}
FSWatcher.prototype = new EventEmitter();
FSWatcher.prototype.constructor = FSWatcher;

module.exports = FSWatcher;
