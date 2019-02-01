'use strict';

const { promisify } = require('es6-promisify');

const Path = require('../path.js');

const providers = require('../providers/index.js');

const Shell = require('../shell/shell.js');
const Intercom = require('../../lib/intercom.js');
const FSWatcher = require('../fs-watcher.js');
const Errors = require('../errors.js');
const {
  nop,
  guid: defaultGuidFn
} = require('../shared.js');

const {
  fsConstants,
  FILE_SYSTEM_NAME,
  FS_FORMAT,
  FS_READY,
  FS_PENDING,
  FS_ERROR,
  FS_NODUPEIDCHECK,
  STDIN,
  STDOUT,
  STDERR
} = require('../constants.js');

// The core fs operations live on impl
const impl = require('./implementation.js');

// node.js supports a calling pattern that leaves off a callback.
function maybeCallback(callback) {
  if (typeof callback === 'function') {
    return callback;
  }
  return function (err) {
    if (err) {
      throw err;
    }
  };
}

// Default callback that logs an error if passed in
function defaultCallback(err) {
  if (err) {
    /* eslint no-console: 0 */
    console.error('Filer error: ', err);
  }
}
// Get a path (String) from a file:// URL. Support URL() like objects
// https://github.com/nodejs/node/blob/968e901aff38a343b1de4addebf79fd8fa991c59/lib/internal/url.js#L1381
function toPathIfFileURL(fileURLOrPath) {
  if (!(fileURLOrPath &&
    fileURLOrPath.protocol &&
    fileURLOrPath.pathname)) {
    return fileURLOrPath;
  }

  if (fileURLOrPath.protocol !== 'file:') {
    throw new Errors.EINVAL('only file: URLs are supported for paths', fileURLOrPath);
  }

  const pathname = fileURLOrPath.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2) | 0x20;
      if (pathname[n + 1] === '2' && third === 102) {
        throw new Errors.EINVAL('file: URLs must not include encoded / characters', fileURLOrPath);
      }
    }
  }

  return decodeURIComponent(pathname);
}

// Allow Buffers for paths. Assumes we want UTF8.
function toPathIfBuffer(bufferOrPath) {
  return Buffer.isBuffer(bufferOrPath) ? bufferOrPath.toString() : bufferOrPath;
}

function validatePath(path, allowRelative) {
  if (!path) {
    return new Errors.EINVAL('Path must be a string', path);
  } else if (Path.isNull(path)) {
    return new Errors.EINVAL('Path must be a string without null bytes.', path);
  } else if (!allowRelative && !Path.isAbsolute(path)) {
    return new Errors.EINVAL('Path must be absolute.', path);
  }
}

function processPathArg(args, idx, allowRelative) {
  let path = args[idx];
  path = toPathIfFileURL(path);
  path = toPathIfBuffer(path);

  // Some methods specifically allow for rel paths (eg symlink with srcPath)
  let err = validatePath(path, allowRelative);
  if (err) {
    throw err;
  }

  // Overwrite path arg with converted and validated path
  args[idx] = path;
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

  const flags = options.flags || [];
  const guid = options.guid ? options.guid : defaultGuidFn;
  const provider = options.provider || new providers.Default(options.name || FILE_SYSTEM_NAME);
  // If we're given a provider, match its name unless we get an explicit name
  const name = options.name || provider.name;
  const forceFormatting = flags.includes(FS_FORMAT);

  const fs = this;
  fs.readyState = FS_PENDING;
  fs.name = name;
  fs.error = null;

  fs.stdin = STDIN;
  fs.stdout = STDOUT;
  fs.stderr = STDERR;

  // Expose Node's fs.constants to users
  fs.constants = fsConstants;
  // Node also forwards the access mode flags onto fs
  fs.F_OK = fsConstants.F_OK;
  fs.R_OK = fsConstants.R_OK;
  fs.W_OK = fsConstants.W_OK;
  fs.X_OK = fsConstants.X_OK;

  // Expose Shell constructor
  this.Shell = Shell.bind(undefined, this);

  // Safely expose the operation queue
  let queue = [];
  this.queueOrRun = function (operation) {
    let error;

    if (FS_READY === fs.readyState) {
      operation.call(fs);
    } else if (FS_ERROR === fs.readyState) {
      error = new Errors.EFILESYSTEMERROR('unknown error');
    } else {
      queue.push(operation);
    }

    return error;
  };
  function runQueued() {
    queue.forEach(function (operation) {
      operation.call(this);
    }.bind(fs));
    queue = null;
  }

  // We support the optional `options` arg from node, but ignore it
  this.watch = function (filename, options, listener) {
    if (Path.isNull(filename)) {
      throw new Error('Path must be a string without null bytes.');
    }
    if (typeof options === 'function') {
      listener = options;
      options = {};
    }
    options = options || {};
    listener = listener || nop;

    const watcher = new FSWatcher();
    watcher.start(filename, false, options.recursive);
    watcher.on('change', listener);

    return watcher;
  };

  // Deal with various approaches to node ID creation
  function wrappedGuidFn(context) {
    return function (callback) {
      // Skip the duplicate ID check if asked to
      if (flags.includes(FS_NODUPEIDCHECK)) {
        callback(null, guid());
        return;
      }

      // Otherwise (default) make sure this id is unused first
      function guidWithCheck(callback) {
        const id = guid();
        context.getObject(id, function (err, value) {
          if (err) {
            callback(err);
            return;
          }

          // If this id is unused, use it, otherwise find another
          if (!value) {
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
    if (!changes.length) {
      return;
    }
    const intercom = Intercom.getInstance();
    changes.forEach(function (change) {
      intercom.emit(change.event, change.path);
    });
  }

  // Open file system storage provider
  provider.open(function (err) {
    function complete(error) {
      function wrappedContext(methodName) {
        let context = provider[methodName]();
        context.name = name;
        context.flags = flags;
        context.changes = [];
        context.guid = wrappedGuidFn(context);

        // When the context is finished, let the fs deal with any change events
        context.close = function () {
          let changes = context.changes;
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
        openReadWriteContext: function () {
          return wrappedContext('getReadWriteContext');
        },
        openReadOnlyContext: function () {
          return wrappedContext('getReadOnlyContext');
        }
      };

      if (error) {
        fs.readyState = FS_ERROR;
      } else {
        fs.readyState = FS_READY;
      }
      runQueued();
      callback(error, fs);
    }

    if (err) {
      return complete(err);
    }

    const context = provider.getReadWriteContext();
    context.guid = wrappedGuidFn(context);

    // Mount the filesystem, formatting if necessary
    if (forceFormatting) {
      // Wipe the storage provider, then write root block
      context.clear(function (err) {
        if (err) {
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
   * Public API for FileSystem. All node.js methods that are exposed on fs.promises
   * include `promise: true`.  We also include our own extra methods, but skip the
   * fd versions to match node.js, which puts these on a `FileHandle` object.
   * Any method that deals with path argument(s) also includes the position of
   * those args in one of `absPathArgs: [...]` or `relPathArgs: [...]`, so they
   * can be processed and validated before being passed on to the method.
   */
  [
    { name: 'appendFile', promises: true, absPathArgs: [0] },
    { name: 'access', promises: true, absPathArgs: [0] },
    { name: 'chown', promises: true, absPathArgs: [0] },
    { name: 'chmod', promises: true, absPathArgs: [0] },
    { name: 'close' },
    // copyFile - https://github.com/filerjs/filer/issues/436
    { name: 'exists', absPathArgs: [0] },
    { name: 'fchown' },
    { name: 'fchmod' },
    // fdatasync - https://github.com/filerjs/filer/issues/653
    { name: 'fgetxattr' },
    { name: 'fremovexattr' },
    { name: 'fsetxattr' },
    { name: 'fstat' },
    { name: 'fsync' },
    { name: 'ftruncate' },
    { name: 'futimes' },
    { name: 'getxattr', promises: true, absPathArgs: [0] },
    // lchown - https://github.com/filerjs/filer/issues/620
    // lchmod - https://github.com/filerjs/filer/issues/619
    { name: 'link', promises: true, absPathArgs: [0, 1] },
    { name: 'lseek' },
    { name: 'lstat', promises: true },
    { name: 'mkdir', promises: true, absPathArgs: [0] },
    { name: 'mkdtemp', promises: true },
    { name: 'mknod', promises: true, absPathArgs: [0] },
    { name: 'open', promises: true, absPathArgs: [0] },
    { name: 'readdir', promises: true, absPathArgs: [0] },
    { name: 'read' },
    { name: 'readFile', promises: true, absPathArgs: [0] },
    { name: 'readlink', promises: true, absPathArgs: [0] },
    // realpath - https://github.com/filerjs/filer/issues/85
    { name: 'removexattr', promises: true, absPathArgs: [0] },
    { name: 'rename', promises: true, absPathArgs: [0, 1] },
    { name: 'rmdir', promises: true, absPathArgs: [0] },
    { name: 'setxattr', promises: true, absPathArgs: [0] },
    { name: 'stat', promises: true, absPathArgs: [0] },
    { name: 'symlink', promises: true, relPathArgs: [0], absPathArgs: [1] },
    { name: 'truncate', promises: true, absPathArgs: [0] },
    // unwatchFile - https://github.com/filerjs/filer/pull/553
    { name: 'unlink', promises: true, absPathArgs: [0] },
    { name: 'utimes', promises: true, absPathArgs: [0] },
    // watch - implemented above in `this.watch`
    // watchFile - https://github.com/filerjs/filer/issues/654
    { name: 'writeFile', promises: true, absPathArgs: [0] },
    { name: 'write' }
  ].forEach(function (method) {
    const methodName = method.name;
    const shouldPromisify = method.promises === true;

    FileSystem.prototype[methodName] = function () {
      const fs = this;
      const args = Array.prototype.slice.call(arguments, 0);
      const lastArgIndex = args.length - 1;

      // We may or may not get a callback, and since node.js supports
      // fire-and-forget style fs operations, we have to dance a bit here.
      const missingCallback = typeof args[lastArgIndex] !== 'function';
      const callback = maybeCallback(args[lastArgIndex]);

      // Deal with path arguments, validating and normalizing Buffer and file:// URLs
      if (method.absPathArgs) {
        method.absPathArgs.forEach(pathArg => processPathArg(args, pathArg, false));
      }
      if (method.relPathArgs) {
        method.relPathArgs.forEach(pathArg => processPathArg(args, pathArg, true));
      }

      const error = fs.queueOrRun(function () {
        const context = fs.provider.openReadWriteContext();

        // Fail early if the filesystem is in an error state (e.g.,
        // provider failed to open.
        if (FS_ERROR === fs.readyState) {
          const err = new Errors.EFILESYSTEMERROR('filesystem unavailable, operation canceled');
          return callback.call(fs, err);
        }

        // Wrap the callback so we can explicitly close the context
        function complete() {
          context.close();
          callback.apply(fs, arguments);
        }

        // Either add or replace the callback with our wrapper complete()
        if (missingCallback) {
          args.push(complete);
        } else {
          args[lastArgIndex] = complete;
        }

        // Forward this call to the impl's version, using the following
        // call signature, with complete() as the callback/last-arg now:
        // fn(fs, context, arg0, arg1, ... , complete);
        const fnArgs = [context].concat(args);
        impl[methodName].apply(null, fnArgs);
      });
      if (error) {
        callback(error);
      }
    };

    // Add to fs.promises if appropriate
    if (shouldPromisify) {
      FileSystem.prototype.promises[methodName] = promisify(FileSystem.prototype[methodName].bind(fs));
    }
  });

}

// Expose storage providers on FileSystem constructor
FileSystem.providers = providers;

module.exports = FileSystem;
