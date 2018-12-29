var { promisify } = require('es6-promisify');

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
  if(typeof callback === 'function') {
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
    /* eslint no-console: 0 */
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

  var flags = options.flags || [];
  var guid = options.guid ? options.guid : defaultGuidFn;
  var provider = options.provider || new providers.Default(options.name || FILE_SYSTEM_NAME);
  // If we're given a provider, match its name unless we get an explicit name
  var name = options.name || provider.name;
  var forceFormatting = flags.includes(FS_FORMAT);

  var fs = this;
  fs.readyState = FS_PENDING;
  fs.name = name;
  fs.error = null;

  fs.stdin = STDIN;
  fs.stdout = STDOUT;
  fs.stderr = STDERR;

  // Expose Node's fs.constants to users
  fs.constants = Constants.fsConstants;

  // Expose Shell constructor
  this.Shell = Shell.bind(undefined, this);

  // Safely expose the list of open files and file
  // descriptor management functions
  var openFiles = {};
  var nextDescriptor = FIRST_DESCRIPTOR;
  Object.defineProperty(this, 'openFiles', {
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

    if(FS_READY === fs.readyState) {
      operation.call(fs);
    } else if(FS_ERROR === fs.readyState) {
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
      if(flags.includes(FS_NODUPEIDCHECK)) {
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
        context.name = name;
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
  FileSystem.prototype.promises = {};
  /**
   * Public API for FileSystem. All node.js methods that are
   * exposed on fs.promises include `promise: true`.  We also
   * include our own extra methods, but skip the fd versions
   * to match node.js, which puts these on a FileHandle object.
   */
  [
    { name: 'open', promises: true },
    { name: 'access', promises: true },
    { name: 'chmod', promises: true },
    { name: 'fchmod' },
    { name: 'chown', promises: true },
    { name: 'fchown' },
    { name: 'close' },
    { name: 'mknod', promises: true },
    { name: 'mkdir', promises: true },
    { name: 'mkdtemp', promises: true },
    { name: 'rmdir', promises: true },
    { name: 'stat', promises: true },
    { name: 'fstat' },
    { name: 'fsync' },
    { name: 'link', promises: true },
    { name: 'unlink', promises: true },
    { name: 'read' },
    { name: 'readFile', promises: true },
    { name: 'write' },
    { name: 'writeFile', promises: true },
    { name: 'appendFile', promises: true },
    { name: 'exists' },
    { name: 'lseek' },
    { name: 'readdir', promises: true },
    { name: 'rename', promises: true },
    { name: 'readlink', promises: true },
    { name: 'symlink', promises: true },
    { name: 'lstat', promises: true },
    { name: 'truncate', promises: true },
    { name: 'ftruncate' },
    { name: 'utimes', promises: true },
    { name: 'futimes' },
    { name: 'setxattr', promises: true },
    { name: 'getxattr', promises: true },
    { name: 'fsetxattr' },
    { name: 'fgetxattr' },
    { name: 'removexattr', promises: true },
    { name: 'fremovexattr' }
  ].forEach(function(method) {
    var methodName = method.name;
    var shouldPromisify = method.promises === true;

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
    
    // Add to fs.promises if appropriate
    if(shouldPromisify) {
      FileSystem.prototype.promises[methodName] = promisify(FileSystem.prototype[methodName].bind(fs));
    }
  });

}

// Expose storage providers on FileSystem constructor
FileSystem.providers = providers;

module.exports = FileSystem;
