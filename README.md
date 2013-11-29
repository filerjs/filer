###IDBFS

IDBFS is a POSIX-like file system interface for browser-based JavaScript.
The API is as close to the node.js [fs module](http://nodejs.org/api/fs.html) as possible
with the following differences:
* No synchronous versions of methods (e.g., `mkdir()` but not `mkdirSync()`).
* No permissions (e.g., no `chown()`, `chmod()`, etc.).
* No support (yet) for `fs.watchFile()`, `fs.unwatchFile()`, `fs.watch()`.
* No support for stream-based operations (e.g., `fs.ReadStream`, `fs.WriteStream`).

### Contributing

The best way to get started is to read through the `Getting Started` and `Example` sections before having a look through the open [issues](https://github.com/js-platform/idbfs/issues). Some of the issues are marked as `good first bug`, but feel free to contribute to any of the issues there, or open a new one if the thing you want to work on isn't there yet. If you would like to have an issue assigned to you, please send me a message and I'll update it.

The build system is based on [grunt](http://gruntjs.com/). To get a working build system
do the following:

```
npm install
npm install -g grunt-cli
```

You can now run the following grunt tasks:
* `grunt check` will run [JSHint](http://www.jshint.com/) on your code (do this before submitting a pull request) to catch errors
* `grunt develop` will create a single file version of the library for testing in `dist/idbfs.js`
* `grunt release` like `develop` but will also create a minified version of the library in `dist/idbfs.min.js`

Once you've done some hacking and you'd like to have your work merged, you'll need to make a pull request. If you're patch includes code, make sure to check that all the unit tests pass, including any new tests you wrote. Finally, make sure you add yourself to the `AUTHORS` file.

#### Tests

You can run the tests from the project by opening the `tests` directory in your browser. You can also run them [here](http://js-platform.github.io/idbfs/tests/).

###Downloading

Pre-built versions of the library are available in the repo:

* [idbfs.js](https://raw.github.com/js-platform/idbfs/develop/dist/idbfs.js)
* [idbfs.min.js](https://raw.github.com/js-platform/idbfs/develop/dist/idbfs.min.js)

### Getting Started

IDBFS is partly based on the `fs` module from node.js. The API is asynchronous and most methods require the caller to provide a callback function. Errors are passed to callbacks through the first parameter.

To create a new file system or open an existing one, create a new `FileSystem` instance and pass the name of the file system. A new IndexedDB database is created for each file system.

For additional documentation, check out the `API Reference` below and have a look through the unit tests for more concrete examples of how things work.

#### Example

```javascript
var fs = new IDBFS.FileSystem();
fs.open('/myfile', 'w+', function(err, fd) {
  if (err) throw err;
  fs.close(fd, function(err) {
    if (err) throw err;
    fs.stat('/myfile', function(err, stats) {
      if (err) throw err;
      console.log('stats: ' + JSON.stringify(stats));
    });
  });
});
```

As with node.js, there is no guarantee that file system operations will be executed in the order they are invoked. Ensure proper ordering by chaining operations in callbacks.

### API Reference

Like node.js, callbacks for methods that accept them are optional but suggested. The first callback parameter is reserved for passing errors. It will be `null` if no errors occurred and should always be checked.

#### IDBFS.FileSystem(options, callback)

File system constructor, invoked to open an existing file system or create a new one. Accepts two arguments: an `options` object,
and an optional `callback`.  The `options` object can specify a number of optional arguments, including:
* `name`: the name of the file system, defaults to "local"
* `flags`: one or more flags to use when creating/opening the file system. Use `'FORMAT'` to force IDBFS to format (i.e., erase) the file system
* `provider`: an explicit storage provider to use for the file system's database context provider.  See below for details

The `callback` function indicates when the file system is ready for use. Depending on the storage provider used, this might
be right away, or could take some time. The callback should expect an `error` argument, which will be null if everything worked.
Also users should check the file system's `readyState` and `error` properties to make sure it is usable.

```javascript
var fs;

function fsReady(err) {
  if(err) throw err;
  // Safe to use fs now...
}

fs = new IDBFS.FileSystem({
  name: "my-filesystem",
  flags: 'FORMAT',
  provider: new IDBFS.FileSystem.providers.Memory()
}, fsReady);
```

####IDBFS.FileSystem.providers - Storage Providers

IDBFS can be configured to use a number of different storage providers. The provider object encapsulates all aspects
of data access, making it possible to swap in different backend storage options.  There are currently 4 different
providers to choose from:
* `FileSystem.providers.IndexedDB()` - uses IndexedDB
* `FileSystem.providers.WebSQL()` - uses WebSQL
* `FileSystem.providers.Fallback()` - attempts to use IndexedDB if possible, falling-back to WebSQL if necessary
* `FileSystem.providers.Memory()` - uses memory (not suitable for data that needs to survive the current session)

You can choose your provider when creating a `FileSystem`:

```javascript
var FileSystem = IDBFS.FileSystem;
var providers = FileSystem.providers;

// Example 1: Use the default provider (currently IndexedDB)
var fs1 = new FileSystem();

// Example 2: Explicitly use IndexedDB
var fs2 = new FileSystem({ provider: new providers.IndexedDB() });

// Example 3: Use one of IndexedDB or WebSQL, whichever is supported
var fs3 = new FileSystem({ provider: new providers.Fallback() });
```

Every provider has an `isSupported()` method, which returns `true` if the browser supports this provider:

```javascript
if( IDBFS.FileSystem.providers.WebSQL.isSupported() ) {
  ...
}
```

You can also write your own provider if you need a different backend. See the code in `src/providers` for details.

####IDBFS.Path

The node.js [path module](http://nodejs.org/api/path.html) is available via the `IDBFS.Path` object. It is
identical to the node.js version with the following differences:
* No support for `exits()` or `existsSync()`. Use `fs.stat()` instead.
* No notion of a current working directory in `resolve` (the root dir is used instead)

```javascript
var path = IDBFS.Path;
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
* `path.normalize(p)`
* `path.join([path1], [path2], [...])`
* `path.resolve([from ...], to)`
* `path.relative(from, to)`
* `path.dirname(p)`
* `path.basename(p, [ext])`
* `path.extname(p)`
* `path.sep`
* `path.delimiter`

#### fs.stat(path, callback)

Asynchronous stat(2). Callback gets `(error, stats)`, where `stats` is an object like

```
{
  node: <string> // internal node id (unique)
  dev: <string> // file system name
  size: <number> // file size in bytes
  nlinks: <number> // number of links
  atime: <number> // last access time
  mtime: <number> // last modified time
  ctime: <number> // creation time
  type: <string> // file type (FILE, DIRECTORY, ...)
}
```

#### fs.fstat(fd, callback)

Asynchronous stat(2). Callback gets `(error, stats)`. See `fs.stat`.

#### fs.link(srcPath, dstPath, callback)

Asynchronous link(2). Callback gets no additional arguments.

#### fs.unlink(path, callback)

Asynchronous unlink(2). Callback gets no additional arguments.

#### fs.rename(oldPath, newPath, callback)#

Asynchronous rename(2). Callback gets no additional arguments.

#### fs.rmdir(path, callback)

Asynchronous rmdir(2). Callback gets no additional arguments.

#### fs.mkdir(path, callback)

Asynchronous mkdir(2). Callback gets no additional arguments.

#### fs.close(fd, callback)

Asynchronous close(2). Callback gets no additional arguments.

#### fs.open(path, flags, callback)

Asynchronous open(2). Flags can be

  * `'r'`: Open file for reading. An exception occurs if the file does not exist.
  * `'r+'`: Open file for reading and writing. An exception occurs if the file does not exist.
  * `'w'`: Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
  * `'w+'`: Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
  * `'a'`: Open file for appending. The file is created if it does not exist.
  * `'a+'`: Open file for reading and appending. The file is created if it does not exist.

Callback gets `(error, fd)`, where `fd` is the file descriptor.

Unlike node.js, IDBFS does not accept the optional `mode` parameter since it doesn't yet implement file permissions.

#### fs.write(fd, buffer, offset, length, position, callback)

Write bytes from `buffer` to the file specified by `fd`, where `offset` and `length` describe the part of the buffer to be written. The `position` refers to the offset from the beginning of the file where this data should be written. If `position` is `null`, the data will be written at the current position. See pwrite(2).

The callback gets `(error, nbytes)`, where `nbytes` is the number of bytes written.

#### fs.writeFile(filename, data, [options], callback)

Asynchronously writes data to a file. `data` can be a string or a buffer, in which case any encoding option is ignored. The `options` argument is optional, and can take the form `"utf8"` (i.e., an encoding) or be an object literal: `{ encoding: "utf8", flag: "w" }`. If no encoding is specified, and `data` is a string, the encoding defaults to `'utf8'`.  The callback gets `(error)`.

```javascript
// Write UTF8 text file
fs.writeFile('/myfile.txt', "...data...", function (err) {
  if (err) throw err;
});

// Write binary file
fs.writeFile('/myfile', buffer, function (err) {
  if (err) throw err;
});
```

#### fs.read(fd, buffer, offset, length, position, callback)

Read bytes from the file specified by `fd` into `buffer`, where `offset` and `length` describe the part of the buffer to be used. The `position` refers to the offset from the beginning of the file where this data should be read. If `position` is `null`, the data will be written at the current position. See pread(2).

The callback gets `(error, nbytes)`, where `nbytes` is the number of bytes read.

#### fs.readFile(filename, [options], callback)

Asynchronously reads the entire contents of a file. The `options` argument is optional, and can take the form `"utf8"` (i.e., an encoding) or be an object literal: `{ encoding: "utf8", flag: "r" }`. If no encoding is specified, the raw binary buffer is returned on the callback. The callback gets `(error, data)`, where data is the contents of the file.

```javascript
// Read UTF8 text file
fs.readFile('/myfile.txt', 'utf8', function (err, data) {
  if (err) throw err;
  console.log(data);
});

// Read binary file
fs.readFile('/myfile.txt', function (err, data) {
  if (err) throw err;
  console.log(data);
});
```

#### fs.lseek(fd, offset, whence, callback)

Asynchronous lseek(2), where `whence` can be `SET`, `CUR`, or `END`. Callback gets `(error, pos)`, where `pos` is the resulting offset, in bytes, from the beginning of the file.

#### fs.readdir(path, callback)

Asynchronous readdir(3). Reads the contents of a directory. Callback gets `(error, files)`, where `files` is an array containing the names of each file in the directory, excluding `.` and `..`.

#### fs.symlink(srcPath, dstPath, callback)

Asynchronous symlink(2). Callback gets no additional arguments.

Unlike node.js, IDBFS does not accept the optional `type` parameter.

#### fs.readlink(path, callback)

Asynchronous readlink(2). Callback gets `(error, linkContents)`, where `linkContents` is a string containing the path to which the symbolic link links to.

#### fs.lstat(path, callback)

Asynchronous lstat(2). Callback gets `(error, stats)`, See `fs.stat`.
