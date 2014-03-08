define(function(require) {

  var EventEmitter = require('EventEmitter');
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

    function onchange(event, path) {
      // Watch for exact filename, or parent path when recursive is true
      if(filename === path || (recursive && path.indexOf(filename + '/') === 0)) {
        self.emit('change', 'change', path);
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
