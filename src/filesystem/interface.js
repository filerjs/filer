define(function(require) {

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
