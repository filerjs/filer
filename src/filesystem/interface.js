define(function(require) {

  var _ = require('nodash');

  // TextEncoder and TextDecoder will either already be present, or use this shim.
  // Because of the way the spec is defined, we need to get them off the global.
  require('encoding');

  var normalize = require('src/path').normalize;
  var dirname = require('src/path').dirname;
  var basename = require('src/path').basename;
  var isAbsolutePath = require('src/path').isAbsolute;
  var isNullPath = require('src/path').isNull;

  var hash = require('src/shared').hash;
  var nop = require('src/shared').nop;

  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FS_FORMAT = require('src/constants').FS_FORMAT;
  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var MODE_SYMBOLIC_LINK = require('src/constants').MODE_SYMBOLIC_LINK;
  var MODE_META = require('src/constants').MODE_META;
  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var SUPER_NODE_ID = require('src/constants').SUPER_NODE_ID;
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
  var XATTR_CREATE = require('src/constants').XATTR_CREATE;
  var XATTR_REPLACE = require('src/constants').XATTR_REPLACE;
  var FS_NOMTIME = require('src/constants').FS_NOMTIME;
  var FS_NOCTIME = require('src/constants').FS_NOCTIME;

  var providers = require('src/providers/providers');
  var adapters = require('src/adapters/adapters');

  var Shell = require('src/shell');
  var Intercom = require('intercom');
  var FSWatcher = require('src/fs-watcher');
  var Errors = require('src/errors');
  var DirectoryEntry = require('src/directory-entry');
  var OpenFileDescription = require('src/open-file-description');
  var SuperNode = require('src/super-node');
  var Node = require('src/node');
  var Stats = require('src/stats');

  // The core fs operations live on impl
  var impl = require('src/filesystem/implementation');

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

  FileSystem.prototype.open = function(path, flags, mode, callback) {
    // We support the same signature as node with a `mode` arg, but
    // ignore it. Find the callback.
    callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.open(fs, context, path, flags, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.close = function(fd, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.close(fs, fd, complete);
      }
    );
    if(error) callback(error);
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
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.mkdir(context, path, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.rmdir = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.rmdir(context, path, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.stat = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.stat(context, fs.name, path, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.fstat = function(fd, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.fstat(fs, context, fd, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.link = function(oldpath, newpath, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.link(context, oldpath, newpath, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.unlink = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.unlink(context, path, complete);
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
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          wrapper.apply(this, arguments);
        }
        impl.read(fs, context, fd, buffer, offset, length, position, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readFile = function(path, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.readFile(fs, context, path, options, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.write = function(fd, buffer, offset, length, position, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.write(fs, context, fd, buffer, offset, length, position, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.writeFile = function(path, data, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.writeFile(fs, context, path, data, options, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.appendFile = function(path, data, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.appendFile(fs, context, path, data, options, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.exists = function(path, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.exists(context, fs.name, path, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.lseek = function(fd, offset, whence, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.lseek(fs, context, fd, offset, whence, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readdir = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.readdir(context, path, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.rename = function(oldpath, newpath, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.rename(context, oldpath, newpath, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readlink = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.readlink(context, path, complete);
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
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.symlink(context, srcpath, dstpath, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.lstat = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.lstat(fs, context, path, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.truncate = function(path, length, callback) {
    // Follow node.js in allowing the `length` to be optional
    if(typeof length === 'function') {
      callback = length;
      length = 0;
    }
    callback = maybeCallback(callback);
    length = typeof length === 'number' ? length : 0;
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.truncate(context, path, length, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.ftruncate = function(fd, length, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.ftruncate(fs, context, fd, length, complete);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.utimes = function(path, atime, mtime, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.utimes(context, path, atime, mtime, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.futimes = function(fd, atime, mtime, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.futimes(fs, context, fd, atime, mtime, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.setxattr = function (path, name, value, flag, callback) {
    callback = maybeCallback(arguments[arguments.length - 1]);
    var _flag = (typeof flag != 'function') ? flag : null;
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.setxattr(context, path, name, value, _flag, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.getxattr = function (path, name, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.getxattr(context, path, name, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.fsetxattr = function (fd, name, value, flag, callback) {
    callback = maybeCallback(arguments[arguments.length - 1]);
    var _flag = (typeof flag != 'function') ? flag : null;
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.fsetxattr(fs, context, fd, name, value, _flag, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.fgetxattr = function (fd, name, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.fgetxattr(fs, context, fd, name, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.removexattr = function (path, name, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.removexattr(context, path, name, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.fremovexattr = function (fd, name, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.openReadWriteContext();
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }
        impl.fremovexattr(fs, context, fd, name, complete);
      }
    );
    if (error) {
      callback(error);
    }
  };
  FileSystem.prototype.Shell = function(options) {
    return new Shell(this, options);
  };

  return FileSystem;

});
