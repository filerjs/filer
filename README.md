[![NPM](https://nodei.co/npm/filer.png?downloads=true&stars=true)](https://nodei.co/npm/filer/)

[![Build Status](https://secure.travis-ci.org/filerjs/filer.png?branch=develop)](http://travis-ci.org/filerjs/filer) [![codecov](https://codecov.io/gh/filerjs/filer/branch/master/graph/badge.svg)](https://codecov.io/gh/filerjs/filer)

### Filer

Filer is a drop-in replacement for node's `fs` module, a POSIX-like file system
for browsers.

### Compatibility

Filer uses [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
and is [known to work in the following browsers/versions](https://caniuse.com/#feat=indexeddb):

* node.js: v0.10.*+
* IE: 10+
* Edge: 12+
* Firefox: 10+
* Chrome: 23+
* Safari: 10+
* Opera: 15+
* iOS: 10+
* Android Browser: 4.4+

### Contributing

Want to join the fun? We'd love to have you! See [CONTRIBUTING](https://github.com/filerjs/filer/blob/develop/CONTRIBUTING.md).

### How to Get It

Filer can be obtained in a number of ways:

1. Via npm: `npm install filer`
1. Via unpkg: `<script src="https://unpkg.com/filer"></script>` or specify a version directly, for example: [https://unpkg.com/filer@1.0.1/dist/filer.min.js](https://unpkg.com/filer@1.0.1/dist/filer.min.js)

### Loading and Usage

Filer is built as a UMD module and can therefore be loaded as a CommonJS or AMD module, or used via the global.

```javascript
// Option 1: Filer loaded via require()
var Filer = require('filer');

// Option 2: Filer loaded via RequireJS
requirejs.config({
  baseUrl: '/',
  paths: {
    'filer': 'filer/dist/filer'
  }
});
requirejs(['filer'], function(Filer) {...}

// Option 3: Filer on global
var Filer = window.Filer;
```

### Getting Started

Filer is as close to the node.js [fs module](http://nodejs.org/api/fs.html) as possible,
with the following differences:

* No synchronous versions of methods (e.g., `mkdir()` but not `mkdirSync()`).
* No support for stream-based operations (e.g., `fs.ReadStream`, `fs.WriteStream`).

Filer has other features lacking in node.js (e.g., swappable backend
storage providers, extended attributes, etc).

Like node.js, the API is asynchronous and most methods expect the caller to provide
a callback function (note: like node.js, Filer will supply one if it's missing).
Errors are passed to callbacks through the first parameter.  As with node.js,
there is no guarantee that file system operations will be executed in the order
they are invoked. Ensure proper ordering by chaining operations in callbacks.

### Overview

To create a new file system or open an existing one, create a new `FileSystem`
instance.  By default, a new [IndexedDB](https://developer.mozilla.org/en/docs/IndexedDB)
database is created for each file system. The file system can also use other
backend storage providers, for example `Memory`. See the section on [Storage Providers](#providers).

<a name="overviewExample"></a>

```js
const { fs, path } = require('filer');

fs.mkdir('/docs', (err) => {
  if (err) {
    return console.error('Unable to create /docs dir', err);
  }
  
  const filename = path.join('/docs', 'first.txt');
  const data = 'Hello World!\n';

  fs.writeFile(filename, data, (err) => {
    if (err) {
      return console.error('Unable to write /docs/first.txt', err);
    }

    fs.stat(filename, (err, stats) =>  {
      if (err) {
        return console.error('Unable to stat /docs/first.txt', err);
      }

      console.log('Stats for /docs/first.txt:', stats);
    });
  });
});
```

For a complete list of `FileSystem` methods and examples, see the [FileSystem Instance Methods](#FileSystemMethods)
section below.

Filer also includes node's `path` and `Buffer` modules. See the [Filer.Path](#FilerPath) and [Filer.Buffer](#FilerBuffer) sections below.

In addition, common shell operations (e.g., rm, touch, cat, etc.) are supported via the
`FileSystemShell` object, which can be obtained from, and used with a `FileSystem`.
See the[FileSystemShell](#FileSystemShell) section below.

### API Reference

Like node.js, callbacks for methods that accept them are optional but suggested (i.e., if
you omit the callback, errors will be thrown as exceptions). The first callback parameter is
reserved for passing errors. It will be `null` if no errors occurred and should always be checked.

#### Support for Promises

The Promise based API mimics the way node [implements](https://nodejs.org/api/fs.html#fs_fs_promises_api) them. Both `Shell` and `FileSystem` now have a `promises` property, which gives access to Promise based versions of methods in addition to the regular callback style methods. Method names are identical to their callback counterparts with the difference that instead of receiving a final argument as a callback, they return a Promise that is resolved or rejected based on the success of method execution.

See example below:

```javascript
const fs = new Filer.FileSystem().promises;
fs.writeFile('/myfile', 'some data')
  .then(() => fs.stat('/myfile'))
  .then(stats => { console.log(`stats: ${JSON.stringify(stats)}`); })
  .catch(err => { console.error(err); });
```

#### Filer.FileSystem(options, callback) constructor

In most cases, using `Filer.fs` will be sufficient, and provide a working filesystem.
However, if you need more control over the filesystem, you can also use the `FileSystem`
constructor, invoked to open an existing file system or create a new one.

`Filer.FileSystem()` It accepts two arguments: an `options` object, and an optional
`callback` function. The `options` object can specify a number of optional arguments,
including:

* `name`: the name of the file system, defaults to `'"local'`
* `flags`: an Array of one or more flags to use when creating/opening the file system:
  * `'FORMAT'` to force Filer to format (i.e., erase) the file system
  * `'NOCTIME'` to force Filer to not update `ctime` on nodes when metadata changes (i.e., for better performance)
  * `'NOMTIME'` to force Filer to not update `mtime` on nodes when data changes (i.e., for better performance)
* `provider`: an explicit storage provider to use for the file system's database context provider. See the section on [Storage Providers](#providers).

The `callback` function indicates when the file system is ready for use. Depending on the storage provider used, this might
be right away, or could take some time. The callback should expect two arguments: first, an `error` argument, which will be
null if everything worked; second, an instance, such that you can access the newly ready FileSystem instance. Also users
should check the file system's `readyState` and `error` properties to make sure it is usable.

```javascript
var fs;

function fsReady(err, fs) {
  if(err) throw err;
  // Safe to use fs now...
}

fs = new Filer.FileSystem({
  name: "my-filesystem",
  flags: [ 'FORMAT' ],
  provider: new Filer.FileSystem.providers.Memory()
}, fsReady);
```

NOTE: if the optional callback argument is not passed to the `FileSystem` constructor,
operations done on the resulting file system will be queued and run in sequence when
it becomes ready.

#### Filer.FileSystem.providers - Storage Providers<a name="providers"></a>

Filer can be configured to use a number of different storage providers. The provider object encapsulates all aspects of data access, making it possible to swap in different backend storage options.  There are currently 2 providers to choose from:

* `FileSystem.providers.IndexedDB()` - uses IndexedDB
if necessary
* `FileSystem.providers.Memory()` - uses memory (not suitable for data that needs to survive the current session)

**NOTE**: previous versions of Filer also supported `FileSystem.providers.WebSQL()` and
`FileSystem.providers.Fallback()`, which could be used in browsers that supported
WebSQL but not IndexedDB.  [WebSQL has been deprecated](https://www.w3.org/TR/webdatabase/),
and this functionality was removed in `v1.0.0`.  If for some reason you still need it, use [`v0.0.44`](https://github.com/filerjs/filer/releases/tag/v0.0.44).

You can choose your provider when creating a `FileSystem`:

```javascript
var FileSystem = Filer.FileSystem;
var providers = FileSystem.providers;

// Example 1: Use the default provider (currently IndexedDB)
var fs1 = new FileSystem();

// Example 2: Use the Memory provider
var fs2 = new FileSystem({ provider: new providers.Memory() });
```

Every provider has an `isSupported()` method, which returns `true` if the browser supports this provider:

```javascript
if( Filer.FileSystem.providers.IndexedDB.isSupported() ) {
  // IndexedDB provider will work in current environment...
}
```

You can also write your own provider if you need a different backend. See the code in `src/providers` for details.

#### Filer.Buffer<a name="FilerBuffer"></a>

When reading and writing data, Filer follows node.js and uses [`Buffer`](http://nodejs.org/api/buffer.html).
When in a node.js environment, native `Buffer`s can be used, or Filer.Buffer, which is a shortcut
to node's `Buffer`.  In a browser, you can use also use `Filer.Buffer`.

NOTE: a `Filer.Buffer` in a browser is really an augmented `Uint8Array` (i.e., the node `Buffer` api
methods are added to the instance). See https://github.com/feross/buffer for more details.

NOTE: `Filer.Buffer` currently includes the older, deprecated [constructor functions](https://nodejs.org/api/buffer.html#buffer_new_buffer_array), but these will be removed
at some point.  You are encouraged to switch to use the newer class methods `Buffer.from()`
and `Buffer.alloc()`.  See the [node.js Buffer docs](https://nodejs.org/api/buffer.html).

```js
/* Deprecated - see https://nodejs.org/api/buffer.html#buffer_new_buffer_array */
new Buffer(array)
new Buffer(arrayBuffer[, byteOffset[, length]])
new Buffer(buffer)
new Buffer(string[, encoding])
new Buffer(size)

/* Use Instead */
Buffer.from(array)
Buffer.from(arrayBuffer[, byteOffset[, length]])
Buffer.from(buffer)
Buffer.from(string[, encoding])
Buffer.alloc(size)
Buffer.allocUnsafe(size)
```

#### Filer.Path<a name="FilerPath"></a>

The node.js [path module](http://nodejs.org/api/path.html) is available via `Filer.path` or
`Filer.Path` (both are supported for historical reasons, and to match node). The Filer `path`
module is identical to the node.js version (see [https://github.com/browserify/path-browserify](https://github.com/browserify/path-browserify)), with the following differences:

* The CWD always defaults to `/`
* No support for Windows style paths (assume you are on a POSIX system)
* Additional utility methods (see below)

```javascript
var path = Filer.path;
var dir = path.dirname('/foo/bar/baz/asdf/quux');
// dir is now '/foo/bar/baz/asdf'

var base = path.basename('/foo/bar/baz/asdf/quux.html');
// base is now 'quux.html'

var ext = path.extname('index.html');
// ext is now '.html'

var newpath = path.join('/foo', 'bar', 'baz/asdf', 'quux', '..');
// new path is now '/foo/bar/baz/asdf'
```

For more info see the docs in the [path module](http://nodejs.org/api/path.html) for a particular method:
* `path.normalize(p)` - NOTE: Filer.Path.normalize does *not* add a trailing slash
* `path.join([path1], [path2], [...])`
* `path.resolve([from ...], to)`
* `path.relative(from, to)`
* `path.dirname(p)`
* `path.basename(p, [ext])` - NOTE: Filer.Path.basename will return `'/'` vs. `''`
* `path.extname(p)`
* `path.sep`
* `path.delimiter`

Filer.Path also includes the following extra methods:

* `isNull(p)` returns `true` or `false` if the path contains a null character (`'\u0000'`)
* `addTrailing(p)` returns the path `p` with a single trailing slash added
* `removeTrailing(p)` returns the path `p` with trailing slash(es) removed

[As with node.js](https://nodejs.org/api/fs.html#fs_file_paths), all methods below that
accept a `path` argument as a `String` can also take a [`file://` URL](https://nodejs.org/api/fs.html#fs_url_object_support)
or a `Buffer`. For example, all of the following cases will work the same way with Filer:

```js
// 1. path as a String
fs.writeFile('/dir/file.txt', 'data', function(err) {...});

// 2. path as a URL
fs.writeFile(new URL('file:///dir/file.txt'), 'data', function(err) {...});

// 3. path as a Buffer
fs.writeFile(Buffer.from('/dir/file.txt'), 'data', function(err) {...});
```

#### Filer.Errors<a name="Errors"></a>

The error objects used internally by Filer are also exposed via the `Filer.Errors` object. As much as possible
these match their node.js counterparts, with a few Filer-specifc additions.
See [src/errors.js](https://github.com/filerjs/filer/blob/develop/src/errors.js) for the complete
list. Errors can be used, or compared, like so:

Examples:

```javascript
// Example 1: create an EExist error
var err1 = new Filer.Errors.EEXIST();
var err2 = new Filer.Errors[47];

// Example 2: compare an error to see if it is EInvalid
function callback(err) {
  if(err instanceof Filer.Errors.EINVAL){
    ...
  }

  // Or compare the error's code
  if(err.code === 'EINVAL') {
    ...
  }
}

// Example 4: compare an error using errno
function callback(err) {
  if(err.errno === 47){
    ...
  }

// Example 5: display the error message
console.log(err.message);
```

### FileSystem Instance Methods<a name="FileSystemMethods"></a>

Once a `FileSystem` is created, it has the following methods. NOTE: code examples below assume
a `FileSystem` instance named `fs` has been created like so:

```javascript
// 1. Using Filer.fs for a default filesystem
const { fs } = require('filer');

// 2. Or via the FileSystem constructor with specified options
const fs = new Filer.FileSystem(options, callback);
```

* [fs.rename(oldPath, newPath, callback)](#rename)
* [fs.ftruncate(fd, len, callback)](#ftruncate)
* [fs.truncate(path, len, callback)](#truncate)
* [fs.stat(path, callback)](#stat)
* [fs.fstat(fd, callback)](#fstat)
* [fs.lstat(path, callback)](#lstat)
* [fs.exists(path, callback)](#exists)
* [fs.link(srcpath, dstpath, callback)](#link)
* [fs.symlink(srcpath, dstpath, [type], callback)](#symlink)
* [fs.readlink(path, callback)](#readlink)
* [fs.realpath(path, [cache], callback)](#realpath)
* [fs.unlink(path, callback)](#unlink)
* [fs.mknod(path, mode, callback)](#mknod)
* [fs.rmdir(path, callback)](#rmdir)
* [fs.mkdir(path, [mode], callback)](#mkdir)
* [fs.access(path, [mode], callback)](#access)
* [fs.mkdtemp(path, [options], callback)](#mkdtemp)
* [fs.readdir(path, callback)](#readdir)
* [fs.close(fd, callback)](#close)
* [fs.open(path, flags, [mode], callback)](#open)
* [fs.utimes(path, atime, mtime, callback)](#utimes)
* [fs.chown(path, uid, gid, callback)](#chown)
* [fs.fchown(fd, uid, gid, callback)](#fchown)
* [fs.chmod(path, mode, callback)](#chmod)
* [fs.fchmod(fd, mode, callback)](#fchmod)
* [fs.futimes(fd, atime, mtime, callback)](#fsutimes)
* [fs.fsync(fd, callback)](#fsync)
* [fs.write(fd, buffer, offset, length, position, callback)](#write)
* [fs.read(fd, buffer, offset, length, position, callback)](#read)
* [fs.readFile(filename, [options], callback)](#readFile)
* [fs.writeFile(filename, data, [options], callback)](#writeFile)
* [fs.appendFile(filename, data, [options], callback)](#appendFile)
* [fs.setxattr(path, name, value, [flag], callback)](#setxattr)
* [fs.fsetxattr(fd, name, value, [flag], callback)](#fsetxattr)
* [fs.getxattr(path, name, callback)](#getxattr)
* [fs.fgetxattr(fd, name, callback)](#fgetxattr)
* [fs.removexattr(path, name, callback)](#removexattr)
* [fs.fremovexattr(fd, name, callback)](#fremovexattr)
* [fs.watch(filename, [options], [listener])](#watch)

#### fs.rename(oldPath, newPath, callback)<a name="rename"></a>

Renames the file at `oldPath` to `newPath`. Asynchronous [rename(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/rename.html).
Callback gets no additional arguments.

Example:

```javascript
// Rename myfile.txt to myfile.bak
fs.rename("/myfile.txt", "/myfile.bak", function(err) {
  if(err) throw err;
  // myfile.txt is now myfile.bak
});
```

#### fs.ftruncate(fd, len, callback)<a name="ftruncate"></a>

Change the size of the file represented by the open file descriptor `fd` to be length
`len` bytes. Asynchronous [ftruncate(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/ftruncate.html).
If the file is larger than `len`, the extra bytes will be discarded; if smaller, its size will
be increased, and the extended area will appear as if it were zero-filled. See also [fs.truncate()](#truncate).

Example:

```javascript
// Create a file, shrink it, expand it.
var buffer = Filer.Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

fs.open('/myfile', 'w', function(err, fd) {
  if(err) throw error;
  fs.write(fd, buffer, 0, buffer.length, 0, function(err, result) {
    if(err) throw error;
      fs.ftruncate(fd, 3, function(err) {
        if(err) throw error;
        // /myfile is now 3 bytes in length, rest of data discarded

        fs.ftruncate(fd, 50, function(err) {
          if(err) throw error;
          // /myfile is now 50 bytes in length, with zero padding at end

          fs.close(fd);
        });
      });
    });
  });
});
```

#### fs.truncate(path, len, callback)<a name="truncate"></a>

Change the size of the file at `path` to be length `len` bytes. Asynchronous [truncate(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/truncate.html). If the file is larger than `len`, the extra bytes will be discarded; if smaller, its size will
be increased, and the extended area will appear as if it were zero-filled. See also [fs.ftruncate()](#ftruncate).

Example:

```javascript
// Create a file, shrink it, expand it.
var buffer = Filer.Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

fs.open('/myfile', 'w', function(err, fd) {
  if(err) throw error;
  fs.write(fd, buffer, 0, buffer.length, 0, function(err, result) {
    if(err) throw error;
    fs.close(fd, function(err) {
      if(err) throw error;

      fs.truncate('/myfile', 3, function(err) {
        if(err) throw error;
        // /myfile is now 3 bytes in length, rest of data discarded

        fs.truncate('/myfile', 50, function(err) {
          if(err) throw error;
          // /myfile is now 50 bytes in length, with zero padding at end

        });
      });
    });
  });
});
```

#### fs.stat(path, callback)<a name="stat"></a>

Obtain file status about the file at `path`. Asynchronous [stat(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/stat.html).
Callback gets `(error, stats)`, where `stats` is an object with the following properties:

```
{
  node: <string>    // internal node id (unique)
  dev: <string>     // file system name
  name: <string>    // the entry's name (basename)
  size: <number>    // file size in bytes
  nlinks: <number>  // number of links
  atime: <date>   // last access time as JS Date Object
  mtime: <date>   // last modified time as JS Date Object
  ctime: <date>   // creation time as JS Date Object
  atimeMs: <number>   // last access time as Unix Timestamp
  mtimeMs: <number>   // last modified time as Unix Timestamp
  ctimeMs: <number>   // creation time as Unix Timestamp
  type: <string>    // file type (FILE, DIRECTORY, SYMLINK),
  gid: <number>     // group name
  uid: <number>     // owner name
  mode: <number>    // permissions
  version: <number> // version of the node
}
```

The following convenience methods are also present on the callback's `stats`:

```
isFile():             Returns true if the node is a file.
isDirectory():        Returns true if the node is a directory.
isBlockDevice():      Not implemented, returns false.
isCharacterDevice():  Not implemented, returns false.
isSymbolicLink():     Returns true if the node is a symbolic link.
isFIFO():             Not implemented, returns false.
isSocket():           Not implemented, returns false.
```

If the file at `path` is a symbolic link, the file to which it links will be used instead.
To get the status of a symbolic link file, use [fs.lstat()](#lstat) instead.

Examples:

```javascript
// Check if a directory exists
function dirExists(path, callback) {
  fs.stat(path, function(err, stats) {
    if(err) return callback(err);
    var exists = stats.type === "DIRECTORY";
    callback(null, exists);
  });
};

// Get the size of a file in KB
function fileSize(path, callback) {
  fs.stat(path, function(err, stats) {
    if(err) return callback(err);
    var kb = stats.size / 1000;
    callback(null, kb);
  });
}
```

#### fs.fstat(fd, callback)<a name="fstat"></a>

Obtain information about the open file known by the file descriptor `fd`.
Asynchronous [fstat(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/fstat.html).
Callback gets `(error, stats)`. `fstat()` is identical to `stat()`, except that the file to be stat-ed is
specified by the open file descriptor `fd` instead of a path.  See also [fs.stat](#stat)

Example:

```javascript
fs.open("/file.txt", "r", function(err, fd) {
  if(err) throw err;
  fs.fstat(fd, function(err, stats) {
    if(err) throw err;
    // do something with stats object
    // ...
    fs.close(fd);
  });
});
```

#### fs.lstat(path, callback)<a name="lstat"></a>

Obtain information about the file at `path` (i.e., the symbolic link file itself) vs.
the destination file to which it links. Asynchronous [lstat(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/lstat.html).
Callback gets `(error, stats)`. See also [fs.stat](#stat).

Example:

```javascript
// Create a symbolic link, /data/logs/current to /data/logs/august
// and get info about the symbolic link file, and linked file.
fs.link("/data/logs/august", "/data/logs/current", function(err) {
  if(err) throw err;

  // Get status of linked file, /data/logs/august
  fs.stat("/data/logs/current", function(err, stats) {
    if(err) throw err;
    // Size of /data/logs/august
    var size = stats.size;
  });

  // Get status of symbolic link file itself
  fs.lstat("/data/logs/current", function(err, stats) {
    if(err) throw err;
    // Size of /data/logs/current
    var size = stats.size;
  });
});
```

#### fs.exists(path, callback)<a name="exists"></a>

Test whether or not the given path exists by checking with the file system.
Then call the callback argument with either true or false.

Example:

```javascript
//Test if the file exists
fs.exists('/myfile', function (exists) {
  console.log(exists ? "file exists" : "file not found");
});
```

fs.exists() is an anachronism and exists only for historical reasons. There should almost never be a reason to use it in your own code.

In particular, checking if a file exists before opening it is an anti-pattern that leaves you vulnerable to race conditions: another process may remove the file between the calls to fs.exists() and fs.open(). Just open the file and handle the error when it's not there.

#### fs.link(srcPath, dstPath, callback)<a name="link"></a>

Create a (hard) link to the file at `srcPath` named `dstPath`. Asynchronous [link(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/link.html). Callback gets no additional arguments. Links are directory entries that point to the same file node.

Example:

```javascript
fs.link('/logs/august.log', '/logs/current', function(err) {
  if(err) throw err;
  fs.readFile('/logs/current', 'utf8', function(err, data) {
    // data is the contents of /logs/august.log
    var currentLog = data;
  });
});
```

#### fs.symlink(srcPath, dstPath, [type], callback)<a name="symlink"></a>

Create a symbolic link to the file at `dstPath` containing the path `srcPath`. Asynchronous [symlink(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/symlink.html). Callback gets no additional arguments.
Symbolic links are files that point to other paths.

NOTE: Filer allows for, but ignores the optional `type` parameter used in node.js.
The `srcPath` may be a relative path, which will be resolved relative to `dstPath`

Example:

```javascript
// Absolute path
fs.symlink('/logs/august.log', '/logs/current', function(err) {
  if(err) throw err;
  fs.readFile('/logs/current', 'utf8', function(err, data) {
    // data is the contents of /logs/august.log
    var currentLog = data;
  });
});

// Relative path
fs.symlink('../file', '/dir/symlink', function(err) {
  if(err) throw err;
  // The /dir/symlink file is now a symlink to /file
});
```

#### fs.readlink(path, callback)<a name="readlink"></a>

Reads the contents of a symbolic link. Asynchronous [readlink(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/readlink.html).
Callback gets `(error, linkContents)`, where `linkContents` is a string
containing the symbolic link's link path.  If the original `srcPath` given
to `symlink()` was a relative path, it will be fully resolved relative
to `dstPath` when returned by `readlink()`.

Example:

```javascript
fs.symlink('/logs/august.log', '/logs/current', function(error) {
  if(error) throw error;

  fs.readlink('/logs/current', function(error, linkContents) {
    // linkContents is now '/logs/august.log'
  });
});
```

#### fs.realpath(path, [cache], callback)<a name="realpath"></a>

NOTE: Not implemented, see https://github.com/filerjs/filer/issues/85

#### fs.unlink(path, callback)<a name="unlink"></a>

Removes the directory entry located at `path`. Asynchronous [unlink(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/unlink.html).
Callback gets no additional arguments. If `path` names a symbolic link, the symbolic link will be removed
(i.e., not the linked file). Otherwise, the filed named by `path` will be removed (i.e., deleted).

Example:

```javascript
// Delete regular file /backup.old
fs.unlink('/backup.old', function(err) {
  if(err) throw err;
  // /backup.old is now removed
});
```

#### fs.mknod(path, mode, callback)<a name="mknod"></a>

Creates a node at `path` based on the mode passed which is either `FILE` or `DIRECTORY`. Asynchronous [mknod(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/mknod.html). Callback gets no additional arguments.

Example:

```javascript
// Create a /dir directory
fs.mknod('/dir', 'DIRECTORY', function(err) {
  if(err) throw err;
  // /dir is now created

  // Create a file inside /dir
  fs.mknod('/dir/myfile', 'FILE', function(err) {
    if(err) throw err;
    // /dir/myfile now exists
  });
});
```

#### fs.rmdir(path, callback)<a name="rmdir"></a>

Removes the directory at `path`. Asynchronous [rmdir(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/rmdir.html).
Callback gets no additional arguments. The operation will fail if the directory at `path` is not empty.

Example:

```javascript
/**
 * Given the following dir structure, remove docs/
 *  /docs
 *    a.txt
 */

// Start by deleting the files in docs/, then remove docs/
fs.unlink('/docs/a.txt', function(err) {
  if(err) throw err;
  fs.rmdir('/docs', function(err) {
    if(err) throw err;
  });
});
```

#### fs.mkdir(path, [mode], callback)<a name="mkdir"></a>

Makes a directory with name supplied in `path` argument. Asynchronous [mkdir(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/mkdir.html). Callback gets no additional arguments.

NOTE: Filer allows for, but ignores the optional `mode` argument used in node.js.

Example:

```javascript
// Create /home and then /home/carl directories
fs.mkdir('/home', function(err) {
  if(err) throw err;

  fs.mkdir('/home/carl', function(err) {
    if(err) throw err;
    // directory /home/carl now exists
  });
});
```

#### fs.access(path, [mode], callback)<a name="access"></a>

Tests a user's permissions for the file or directory supplied in `path` argument. Asynchronous [access(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/access.html). Callback gets no additional arguments. The `mode` argument can be one of the following (constants are available on `fs.constants` and `fs`):

* `F_OK`: Test for existence of file.
* `R_OK`: Test whether the file exists and grants read permission.
* `W_OK`: Test whether the file exists and grants write permission.
* `X_OK`: Test whether the file exists and grants execute permission.

NOTE: you can also create a mask consisting of the bitwise OR of two or more values (e.g. `fs.constants.W_OK | fs.constants.R_OK`).

Example:

```javascript
// Check if the file exists in the current directory.
fs.access(file, fs.F_OK, function(err) {
  console.log(`${file} ${err ? 'does not exist' : 'exists'}`);
});
```

#### fs.mkdtemp(prefix, options, callback)<a name="mkdtemp"></a>

Makes a temporary directory with prefix supplied in `path` argument. Method will append six random characters directly to the prefix. Asynchronous. Callback gets `(error, path)`, where path is the path to the created directory.

NOTE: Filer allows for, but ignores the optional `options` argument used in node.js.

Example:

```javascript
// Create tmp directory with prefix foo
fs.mkdtemp("/foo-", function (error, path) {
    // A new folder foo-xxxxxx will be created. Path contains a path to created folder.    
});

fs.mkdtemp("/myDir/tmp", function (error, path) {
    // Will create a new folder tmpxxxxxx inside myDir directory. 
    // Will throw error if myDir does not exist    
});
```

#### fs.readdir(path, callback)<a name="readdir"></a>

Reads the contents of a directory. Asynchronous [readdir(3)](http://pubs.opengroup.org/onlinepubs/009695399/functions/readdir.html).
Callback gets `(error, files)`, where `files` is an array containing the names of each directory entry (i.e., file, directory, link) in the directory, excluding `.` and `..`.

Example:

```javascript
/**
 * Given the following dir structure:
 *  /docs
 *    a.txt
 *    b.txt
 *    c/
 */
fs.readdir('/docs', function(err, files) {
  if(err) throw err;
  // files now contains ['a.txt', 'b.txt', 'c']
});
```

#### fs.close(fd, callback)<a name="close"></a>

Closes a file descriptor. Asynchronous [close(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/close.html).
Callback gets no additional arguments.

Example:

```javascript
fs.open('/myfile', 'w', function(err, fd) {
  if(err) throw error;

  // Do something with open file descriptor `fd`

  // Close file descriptor when done
  fs.close(fd);
});
```

#### fs.open(path, flags, [mode], callback)<a name="open"></a>

Opens a file. Asynchronous [open(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/open.html).
Callback gets `(error, fd)`, where `fd` is the file descriptor. The `flags` argument can be:

* `'r'`: Open file for reading. An exception occurs if the file does not exist.
* `'r+'`: Open file for reading and writing. An exception occurs if the file does not exist.
* `'w'`: Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
* `'w+'`: Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
* `'a'`: Open file for appending. The file is created if it does not exist.
* `'a+'`: Open file for reading and appending. The file is created if it does not exist.

NOTE: Filer allows for, but ignores the optional `mode` argument used in node.js.

Example:

```javascript
fs.open('/myfile', 'w', function(err, fd) {
  if(err) throw error;

  // Do something with open file descriptor `fd`

  // Close file descriptor when done
  fs.close(fd);
});
```

#### fs.utimes(path, atime, mtime, callback)<a name="utimes"></a>

Changes the file timestamps for the file given at path `path`. Asynchronous [utimes(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/utimes.html). Callback gets no additional arguments. Both `atime` (access time) and `mtime` (modified time) arguments should be a JavaScript Date or Number.

Example:

```javascript
var now = Date.now();
fs.utimes('/myfile.txt', now, now, function(err) {
  if(err) throw err;
  // Access Time and Modified Time for /myfile.txt are now updated
});
```

#### fs.futimes(fd, atime, mtime, callback)<a name="futimes"></a>

Changes the file timestamps for the open file represented by the file descriptor `fd`. Asynchronous [utimes(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/utimes.html). Callback gets no additional arguments. Both `atime` (access time) and `mtime` (modified time) arguments should be a JavaScript Date or Number.

Example:

```javascript
fs.open('/myfile.txt', function(err, fd) {
  if(err) throw err;

  var now = Date.now();
  fs.futimes(fd, now, now, function(err) {
    if(err) throw err;

    // Access Time and Modified Time for /myfile.txt are now updated

    fs.close(fd);
  });
});
```

#### fs.chown(path, uid, gid, callback)<a name="chown"></a>

Changes the owner and group of a file. Asynchronous [chown(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/chown.html). Callback gets no additional arguments. Both `uid` (user id) and `gid` (group id) arguments should be a JavaScript Number.  By default, `0x0` is used (i.e., `root:root` ownership).

Example:

```javascript
fs.chown('/myfile.txt', 500, 500, function(err) {
  if(err) throw err;

  // /myfile.txt is now owned by user with id 500, group 500
});
```

#### fs.fchown(fd, uid, gid, callback)<a name="fchown"></a>

Changes the owner and group of a file. Asynchronous [chown(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/chown.html). Callback gets no additional arguments. Both `uid` (user id) and `gid` (group id) arguments should be a JavaScript Number.  By default, `0x0` is used (i.e., `root:root` ownership).

Example:

```javascript
fs.open('/myfile.txt', function(err, fd) {
  if(err) throw err;

  fs.fchown(fd, 500, 500, function(err) {
    if(err) throw err;

    // /myfile.txt is now owned by user with id 500, group 500

    fs.close(fd);
  });
});
```

#### fs.chmod(path, mode, callback)<a name="chmod"></a>

Changes the mode of a file. Asynchronous [chmod(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/chmod.html). Callback gets no additional arguments. The `mode` argument should be a JavaScript Number, which combines file type and permission information.  Here are a list of common values useful for setting the `mode`:

* File type `S_IFREG=0x8000`
* Dir type `S_IFDIR=0x4000`
* Link type `S_IFLNK=0xA000`

* Permissions `755=0x1ED`
* Permissions `644=0x1A4`
* Permissions `777=0x1FF`
* Permissions `666=0x1B6`

By default, directories use `(0x4000 | 0x1ED)` and files use `(0x8000 | 0x1A4)`.

Example:

```javascript
// S_IFREG | 0o777
var mode = 0x8000 | 0x1FF
fs.chmod('/myfile.txt', mode, function(err) {
  if(err) throw err;

  // /myfile.txt is a regular file with permissions 777
});
```

#### fs.fchmod(fd, mode, callback)<a name="fchmod"></a>

Changes the mode of a file. Asynchronous [chmod(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/chmod.html). Callback gets no additional arguments. The `mode` argument should be a JavaScript Number, which combines file type and permission information.  By default, `755` (dir) and `644` (file) are used.

Example:

```javascript
fs.open('/myfile.txt', function(err, fd) {
  if(err) throw err;

  // S_IFREG | 0o777
  var mode = 0x8000 | 0x1FF
  fs.fchmod(fd, mode, function(err) {
    if(err) throw err;

    // /myfile.txt is a regular file with permissions 777

    fs.close(fd);
  });
});
```

#### fs.fsync(fd, callback)<a name="fsync"></a>

Synchronize the data and metadata for the file referred to by `fd` to disk.
Asynchronous [fsync(2)](http://man7.org/linux/man-pages/man2/fsync.2.html).
The callback gets `(error)`.

```js
fs.open('/myfile', 'r', function(error, fd) {
  if(err) throw err;

  // Use fd, then sync

  fs.fsync(fd, function(error) {
    if(err) throw err;
    fs.close(fd, done);
  });
});
```

#### fs.write(fd, buffer, offset, length, position, callback)<a name="write"></a>

Writes bytes from `buffer` to the file specified by `fd`. Asynchronous [write(2), pwrite(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/write.html). The `offset` and `length` arguments describe the part of the buffer to be written. The `position` refers to the offset from the beginning of the file where this data should be written. If `position` is `null`, the data will be written at the current position. The callback gets `(error, nbytes)`, where `nbytes` is the number of bytes written.

NOTE: Filer currently writes the entire buffer in a single operation. However, future versions may do it in chunks.

Example:

```javascript
// Create a file with the following bytes.
var buffer = Filer.Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

fs.open('/myfile', 'w', function(err, fd) {
  if(err) throw error;

  var expected = buffer.length, written = 0;
  function writeBytes(offset, position, length) {
    length = length || buffer.length - written;

    fs.write(fd, buffer, offset, length, position, function(err, nbytes) {
      if(err) throw error;

      // nbytes is now the number of bytes written, between 0 and buffer.length.
      // See if we still have more bytes to write.
      written += nbytes;

      if(written < expected)
        writeBytes(written, null);
      else
        fs.close(fd);
    });
  }

  writeBytes(0, 0);
});
```

#### fs.read(fd, buffer, offset, length, position, callback)<a name="read"></a>

Read bytes from the file specified by `fd` into `buffer`. Asynchronous [read(2), pread(2)](http://pubs.opengroup.org/onlinepubs/009695399/functions/read.html). The `offset` and `length` arguments describe the part of the buffer to be used. The `position` refers to the offset from the beginning of the file where this data should be read. If `position` is `null`, the data will be written at the current position. The callback gets `(error, nbytes)`, where `nbytes` is the number of bytes read.

NOTE: Filer currently reads into the buffer in a single operation. However, future versions may do it in chunks.

Example:

```javascript
fs.open('/myfile', 'r', function(err, fd) {
  if(err) throw err;

  // Determine size of file
  fs.fstat(fd, function(err, stats) {
    if(err) throw err;

    // Create a buffer large enough to hold the file's contents
    var nbytes = expected = stats.size;
    var buffer = Filer.Buffer.alloc(nbytes);
    var read = 0;

    function readBytes(offset, position, length) {
      length = length || buffer.length - read;

      fs.read(fd, buffer, offset, length, position, function(err, nbytes) {
        if(err) throw err;

        // nbytes is now the number of bytes read, between 0 and buffer.length.
        // See if we still have more bytes to read.
        read += nbytes;

        if(read < expected)
          readBytes(read, null);
        else
          fs.close(fd);
      });
    }

    readBytes(0, 0);
  });
});
```

#### fs.readFile(filename, [options], callback)<a name="readFile"></a>

Reads the entire contents of a file. The `options` argument is optional, and can take the form `"utf8"` (i.e., an encoding) or be an object literal: `{ encoding: "utf8", flag: "r" }`. If no encoding is specified, the raw binary buffer is returned via the callback. The callback gets `(error, data)`, where data is the contents of the file.

Examples:

```javascript
// Read UTF8 text file
fs.readFile('/myfile.txt', 'utf8', function (err, data) {
  if (err) throw err;
  // data is now the contents of /myfile.txt (i.e., a String)
});

// Read binary file
fs.readFile('/myfile.txt', function (err, data) {
  if (err) throw err;
  // data is now the contents of /myfile.txt (i.e., a Buffer with the bytes)
});
```

#### fs.writeFile(filename, data, [options], callback)<a name="writeFile"></a>

Writes data to a file. `data` can be a string or `Buffer`, in which case any encoding option is ignored. The `options` argument is optional, and can take the form `"utf8"` (i.e., an encoding) or be an object literal: `{ encoding: "utf8", flag: "w" }`. If no encoding is specified, and `data` is a string, the encoding defaults to `'utf8'`.  The callback gets `(error)`.

Examples:

```javascript
// Write UTF8 text file
fs.writeFile('/myfile.txt', "...data...", function (err) {
  if (err) throw err;
});

// Write binary file
var buffer = Filer.Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
fs.writeFile('/myfile', buffer, function (err) {
  if (err) throw err;
});
```

#### fs.appendFile(filename, data, [options], callback)<a name="appendFile"></a>

Writes data to the end of a file. `data` can be a string or a `Buffer`, in which case any encoding option is ignored. The `options` argument is optional, and can take the form `"utf8"` (i.e., an encoding) or be an object literal: `{ encoding: "utf8", flag: "w" }`. If no encoding is specified, and `data` is a string, the encoding defaults to `'utf8'`.  The callback gets `(error)`.

Examples:

```javascript
// Append UTF8 text file
fs.writeFile('/myfile.txt', "More...", function (err) {
	if (err) throw err;
});
fs.appendFile('/myfile.txt', "Data...", function (err) {
  if (err) throw err;
});
// '/myfile.txt' would now read out 'More...Data...'

// Append binary file
var data = Filer.Buffer.from([1, 2, 3, 4]);
var more = Filer.Buffer.from([5, 6, 7, 8]);

fs.writeFile('/myfile', data, function (err) {
  if (err) throw err;

  fs.appendFile('/myfile', more, function (err) {
    if (err) throw err;

    // '/myfile' would now contain [1, 2, 3, 4, 5, 6, 7, 8]
  });
});
```

#### fs.setxattr(path, name, value, [flag], callback)<a name="setxattr"></a>

Sets an extended attribute of a file or directory named `path`. Asynchronous [setxattr(2)](http://man7.org/linux/man-pages/man2/setxattr.2.html).
The optional `flag` parameter can be set to the following:
* `XATTR_CREATE`: ensures that the extended attribute with the given name will be new and not previously set. If an attribute with the given name already exists, it will return an `EExists` error to the callback.
* `XATTR_REPLACE`: ensures that an extended attribute with the given name already exists. If an attribute with the given name does not exist, it will return an `ENoAttr` error to the callback.

Callback gets no additional arguments.

Example:

```javascript
fs.writeFile('/myfile', 'data', function(err) {
  if(err) throw err;

  // Set a simple extended attribute on /myfile
  fs.setxattr('/myfile', 'extra', 'some-information', function(err) {
    if(err) throw err;

    // /myfile now has an added attribute of extra='some-information'
  });

  // Set a complex object attribute on /myfile
  fs.setxattr('/myfile', 'extra-complex', { key1: 'value1', key2: 103 }, function(err) {
    if(err) throw err;

    // /myfile now has an added attribute of extra={ key1: 'value1', key2: 103 }
  });
});
```

#### fs.fsetxattr(fd, name, value, [flag], callback)<a name="fsetxattr"></a>

Sets an extended attribute of the file represented by the open file descriptor `fd`. Asynchronous [setxattr(2)](http://man7.org/linux/man-pages/man2/setxattr.2.html).  See `fs.setxattr` for more details. Callback gets no additional arguments.

Example:

```javascript
fs.open('/myfile', 'w', function(err, fd) {
  if(err) throw err;

  // Set a simple extended attribute on fd for /myfile
  fs.fsetxattr(fd, 'extra', 'some-information', function(err) {
    if(err) throw err;

    // /myfile now has an added attribute of extra='some-information'
  });

  // Set a complex object attribute on fd for /myfile
  fs.fsetxattr(fd, 'extra-complex', { key1: 'value1', key2: 103 }, function(err) {
    if(err) throw err;

    // /myfile now has an added attribute of extra={ key1: 'value1', key2: 103 }
  });

  fs.close(fd);
});
```

#### fs.getxattr(path, name, callback)<a name="getxattr"></a>

Gets an extended attribute value for a file or directory. Asynchronous [getxattr(2)](http://man7.org/linux/man-pages/man2/getxattr.2.html).
Callback gets `(error, value)`, where `value` is the value for the extended attribute named `name`.

Example:

```javascript
// Get the value of the extended attribute on /myfile named `extra`
fs.getxattr('/myfile', 'extra', function(err, value) {
  if(err) throw err;

  // `value` is now the value of the extended attribute named `extra` for /myfile
});
```

#### fs.fgetxattr(fd, name, callback)<a name="fgetxattr"></a>

Gets an extended attribute value for the file represented by the open file descriptor `fd`.
Asynchronous [getxattr(2)](http://man7.org/linux/man-pages/man2/getxattr.2.html).
See `fs.getxattr` for more details. Callback gets `(error, value)`, where `value` is the value for the extended attribute named `name`.

Example:

```javascript
// Get the value of the extended attribute on /myfile named `extra`
fs.open('/myfile', 'r', function(err, fd) {
  if(err) throw err;

  fs.fgetxattr(fd, 'extra', function(err, value) {
    if(err) throw err;

    // `value` is now the value of the extended attribute named `extra` for /myfile
  });

  fs.close(fd);
});
```

#### fs.removexattr(path, name, callback)<a name="removexattr"></a>

Removes the extended attribute identified by `name` for the file given at `path`. Asynchronous [removexattr(2)](http://man7.org/linux/man-pages/man2/removexattr.2.html). Callback gets no additional arguments.

Example:

```javascript
// Remove an extended attribute on /myfile
fs.removexattr('/myfile', 'extra', function(err) {
  if(err) throw err;

  // The `extra` extended attribute on /myfile is now gone
});
```

#### fs.fremovexattr(fd, name, callback)<a name="fremovexattr"></a>

Removes the extended attribute identified by `name` for the file represented by the open file descriptor `fd`.
Asynchronous [removexattr(2)](http://man7.org/linux/man-pages/man2/removexattr.2.html). See `fs.removexattr` for more details.
Callback gets no additional arguments.

Example:

```javascript
// Remove an extended attribute on /myfile
fs.open('/myfile', 'r', function(err, fd) {
  if(err) throw err;

  fs.fremovexattr(fd, 'extra', function(err) {
    if(err) throw err;

    // The `extra` extended attribute on /myfile is now gone
  });

  fs.close(fd);
});
```

#### fs.watch(filename, [options], [listener])<a name="watch"></a>

Watch for changes to a file or directory at `filename`. The object returned is an `FSWatcher`,
which is an [`EventEmitter`](http://nodejs.org/api/events.html) with the following additional method:

* `close()` - stops listening for changes, and removes all listeners from this instance. Use this
to stop watching a file or directory after calling `fs.watch()`.

The only supported option is `recursive`, which if `true` will cause a watch to be placed
on a directory, and all sub-directories and files beneath it.

The `listener` callback gets two arguments `(event, filename)`. `event` is either `'rename'` or `'change'`,
(currenty only `'rename'` is supported) and `filename` is the name of the file/dir which triggered the event.

Unlike node.js, all watch events return a path. Also, all returned paths are absolute from the root
vs. just a relative filename.

Examples:

```javascript
// Example 1: create a watcher to see when a file is created
var watcher = fs.watch('/myfile', function(event, filename) {
  // event could be 'change' or 'rename' and filename will be '/myfile'
  // Stop watching for changes
  watcher.close();
});
fs.writeFile('/myfile', 'data');

// Example 2: add the listener via watcher.on()
var watcher = fs.watch('/myfile2');
watcher.on('change', function(event, filename) {
  // event will be 'change' and filename will be '/myfile2'
  // Stop watching for changes
  watcher.close();
});
fs.writeFile('/myfile2', 'data2');

// Example 3: recursive watch on /data dir
var watcher = fs.watch('/data', { recursive: true }, function(event, filename) {
  // event could be 'change' or 'rename' and filename will be '/data/subdir/file'
  // Stop watching for changes
  watcher.close();
});
fs.writeFile('/data/subdir/file', 'data');
```

### FileSystemShell<a name="FileSystemShell"></a>

Many common file system shell operations are available by using a `FileSystemShell` object.
The `FileSystemShell` is used in conjunction with a `FileSystem`,
and provides augmented features. Many separate `FileSystemShell` objects can exist per
`FileSystem`, but each `FileSystemShell` is bound to a single instance of a `FileSystem`
for its lifetime.

A `FileSystemShell` is created by instantiating `Filer.FileSystem().Shell`:

```javascript
var fs = new Filer.FileSystem();
var sh = new fs.Shell(options);
var sh2 = new fs.Shell(options);
// sh and sh2 are two separate shells, each bound to fs
```

In addition, the constructor function can be accessed through `Filer`:

```javascript
var fs = new Filer.FileSystem();
var sh = new fs.Shell();

Filer.Shell.prototype.newFunction = ...;

sh.newFunction();
```

The `FileSystemShell` can take an optional `options` object. The `options` object
can include `env`, which is a set of environment variables. Currently supported variables
include `TMP` (the path to the temporary directory), and `PATH` (the list of known paths) and
others may be added in the future. You can also add your own, or update existing variables.

```javascript
var fs = new Filer.FileSystem();
var sh = new fs.Shell({
  env: {
    TMP: '/tempdir',
    PATH: '/one:/two'
  }
});
var tempPath = sh.env.get('TMP');
sh.env.set('TMP', '/newtempdir');
```

NOTE: unless otherwise stated, all `FileSystemShell` methods can take relative or absolute
paths. Relative paths are resolved relative to the shell's current working directory (`sh.cwd`).
This is different from the `FileSystem`, which requires absolute paths, and has no notion
of a current working directory.

#### FileSystemShell Properties

A `FileSystemShell` has a number of properties, including:
* `fs` - (readonly) a reference to the bound `FileSystem`
* `env` - (readonly) the shell's environment. The shell's environemnt `env` object has `get(name)`
and `set(name, value)` methods.

Example:

```javascript
var fs = new Filer.FileSystem();
var sh = new fs.Shell();
var p = sh.env.get('PATH');

// Store the current location
var before = sh.pwd();
var after;
sh.cd('/newdir', function(err) {
  if(err) throw err;
  // Get the new location
  after = sh.pwd();
});
```

#### FileSystemShell Instance Methods

Once a `FileSystemShell` object is created, it has the following methods. NOTE: code
examples below assume a `FileSystemShell` instance named `sh` has been created like so:

```javascript
var fs = new Filer.FileSystem();
var sh = new fs.Shell();
```

* [sh.cd(path, callback)](#cd)
* [sh.pwd()](#pwd)
* [sh.find(dir, [options], callback)](#find)
* [sh.ls(dir, [options], callback)](#ls)
* [sh.exec(path, [args], callback)](#exec)
* [sh.touch(path, [options], callback)](#touch)
* [sh.cat(files, callback)](#cat)
* [sh.rm(path, [options], callback)](#rm)
* [sh.tempDir(callback)](#tempDir)
* [sh.mkdirp(path, callback)](#mkdirp)


#### sh.cd(path, callback)<a name="cd"></a>

Changes the current working directory to the directory at `path`. The callback returns
an error if `path` does not exist, or is not a directory. Once the callback occurs
the shell's cwd is updated to the new path (you can access it via `sh.pwd()`).

Example:

```javascript
sh.cd('/dir1', function(err) {
  if(err) throw err;
  // sh.pwd() is now '/dir1'
});
```

#### sh.pwd()<a name="pwd"></a>

Returns the shell's current working directory. See [sh.cd()](#cd).

#### sh.find(dir, [options], callback)<a name="find"></a>

Recursively walk a directory tree, reporting back all paths that were
found along the way. Asynchronous [find(1)](http://pubs.opengroup.org/onlinepubs/9699919799/utilities/find.html
)
If given no options, `find` walks the given dir path
and the callback gives `function(err, found)`, where `found` is an array of
all paths discovered during a depth-first walk.

Valid options include a `regex` for pattern matching paths, allowing paths
to be ignored (e.g., ```regex: /\.bak$/``` to find all `.bak` files). You can
also use `name` and `path` to provide a [match pattern](https://github.com/isaacs/minimatch) for the basename and
dirname respectively (e.g., `{name: '*.js'}` to find all JavaScript files or
`{path: '*-modules'}` to only look in folders named `base-modules`, `foo-modules`, etc.).
Finally, you can also provide an `exec` function of the form `function(path, next)` where
`path` is the current path that was found and matches any provided `regex`
(NOTE: dir paths have an '/' appended), and `next` is a callback to call
when you are done processing the path.

Example:

```javascript
function processPath(path, next) {
  // Process the path somehow, in this case we print it.
  // Dir paths end with /
  if(path.endsWith('/')) {
    console.log('Found dir: ' + path);
  } else {
    console.log('Found file: ' + path);
  }

  // All done, let the process continue by invoking second arg:
  next();
}

// Get every path (NOTE: no name or regex provided) below the root, depth first
sh.find('/', {exec: processPath}, function(err, found) {
  /* find command is finished, `found` contains the flattened list as an Array */
});

// Find all files that look like map201.jpg, map202.jpg in the /data dir
sh.find('/data', {regex: /map20\d\.jpg$/, exec: processPath}, function(err) {
  /* find command is finished */
});

// Find and delete all *.bak files under /app/user
sh.find('/app/user', {
  name: '*.bak',
  exec: function(path, next) {
    sh.rm(path, next);
  }
}, function callback(err, found) {
  if(err) throw err;

  if(found.length) {
    console.log('Deleted the following ' + found.length + ' files: ', found);
  }
});
```

#### sh.ls(dir, [options], callback)<a name="ls"></a>

Get the listing of a directory, returning an array of directory entries
in the same form as [fs.stat()](#stat), with the exception that a new Array named
`contents` is added for directory entries, containing child entries.

By default `sh.ls()` gives a shallow listing. If you want to follow
directories as they are encountered, use the `recursive=true` option. NOTE:
you should not count on the order of the returned entries always being the same.

Example:

```javascript
/**
 * Given a dir structure of:
 *
 * /dir
 *  file1
 *  file2
 *  dir2/
 *   file3
 */

// Shallow listing
sh.ls('/dir', function(err, entries) {
  if(err) throw err;
  // entries is now an array of 3 file/dir entries under /dir
});

// Deep listing
sh.ls('/dir', { recursive: true }, function(err, entries) {
  if(err) throw err;
  // entries is now an array of 3 file/dir entries under /dir.
  // The entry object for '/dir2' also includes a `contents` property,
  // which is an array of 1 entry element for `file3`.
});
```

#### sh.exec(path, [args], callback)<a name="exec"></a>

Attempts to execute the .js command located at `path`. The `sh.exec` method
enables apps to install larger programs into the file system and run them
later without having to re-download.  Such commands should be written so as
to assume the existence of 3 global variables, which will be defined at runtime:
* `fs` - [FileSystem] the `FileSystem` object bound to this shell.
* `args` - [Array] a list of any arguments for the command, or the empty list
* `callback` - [Function] a callback function of the form `function callback(error, result)`
to call when done.

The .js command's contents should be the body of a function that
looks like this:

```javascript
function(fs, args, callback) {
//-------------------------commmand code here---------
// ...
//----------------------------------------------------
 }
```

Example:

```javascript
// Simple command to delete a file.
var cmd = "fs.unlink(args[0], callback);"

// Write the file to the filesystem
fs.writeFile('/cmd.js', cmd, callback(err) {
  if(err) throw err;

  // Execute the command
  sh.exec('/cmd.js', [ '/file' ], function(err, result) {
    if(err) throw err;
  });
});
```

#### sh.touch(path, [options], callback)<a name="touch"></a>

Create a file if it does not exist, or update the access and modified
times if it does. Valid options include:
* `updateOnly` - `true` if the file's access/modified dates are to be updated
only (but missing file not to be)
* `date` - a date to use instead of the current date and time when updating
access and modified dates.

Example:

```javascript
sh.touch('/newfile', function(err) {
  if(err) throw err;

  fs.exists('/newfile', function(exists) {
    // exists is now true.
  }
});
```

#### sh.cat(files, callback)<a name="cat"></a>

Concatenates multiple files into a single string, with each file
separated by a newline character. The `files` argument should be
a String (i.e., path to a single file) or an Array of Strings (i.e.,
multiple paths for multiple files).

Example:

```javascript
sh.cat([ './file1', '../file2' ], function(err, data) {
  if(err) throw err;
  // data is now the contents of file1 and file2 joined
});
```

#### sh.rm(path, [options], callback)<a name="rm"></a>

Removes (deletes) the file or directory at `path`. If `path` is a file, it will
be removed. If `path` is a directory, it will be removed if it is empty, otherwise
the callback will receive an error. In order to remove non-empty directories,
use the `recursive=true` option.

Example:

```javascript
sh.rm('./file', function(err) {
  if(err) throw err;
  // ./file is now removed
});

sh.rm('/dir', { recursive: true }, function(err) {
  if(err) throw err;
  // /dir and all its children are now removed
});
```

#### sh.tempDir(callback)<a name="tempDir"></a>

Gets the path to the shell's temporary directory, creating it if it
does not already exist. The temp directory to use is specified in the
`env.TMP` environment variable. The callback receives an error
and the `tempDir` path. NOTE: it is safe to call this many times (i.e.,
the temp dir will only be created once). No effort is made to clean-up
the temp dir, and it is up to the caller to destroy it if desired.

Example:

```javascript
// Default /tmp dir
sh.tempDir(function(err, tmp) {
  if(err) throw err;
  // tmp is now '/tmp' by default, and /tmp exists
});

// Specify a tmp dir path
sh.env.TMP = '/temporary'
sh.tempDir(function(err, tmp) {
  if(err) throw err;
  // tmp is now '/temporary', and /temporary exists
});
```

#### sh.mkdirp(path, callback)<a name="mkdirp"></a>

Recursively creates the directory at the provided path. If the
directory already exists, no error is returned. All parents must
be valid directories (not files).

Example:

```javascript
// Default empty filesystem
sh.mkdirp('/test/mkdirp', function(err) {
  if(err) throw err;
  // the root '/' now contains a directory 'test' containing the directory 'mkdirp'
});
```
