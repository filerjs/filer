IDBFS is provides a POSIX-like file system interface for browser-based JavaScript.

* [idbfs.js](https://raw.github.com/js-platform/idbfs/develop/dist/idbfs.js)
* [idbfs.min.js](https://raw.github.com/js-platform/idbfs/develop/dist/idbfs.min.js)

### Contributing

The best way to get started is to read through the `Getting Started` and `Example` sections before having a look through the open [issues](https://github.com/js-platform/idbfs/issues). Some of the issues are marked as `good first bug`, but feel free to contribute to any of the issues there, or open a new one if the thing you want to work on isn't there yet. If you would like to have an issue assigned to you, please send me a message and I'll update it.

Once you've done some hacking and you'd like to have your work merged, you'll need to make a pull request. If you're patch includes code, make sure to check that all the unit tests pass, including any new tests you wrote. Finally, make sure you add yourself to the `AUTHORS` file.

### Getting Started

IDBFS is partly based on the `fs` module from node.js. The API is asynchronous and most methods require the caller to provide a callback function. Errors are passed to callbacks through the first parameter.

To create a new file system or open an existing one, create a new `FileSystem` instance and pass the name of the file system. A new IndexedDB database is created for each file system.

For additional documentation, check out the `API Reference` below and have a look through the unit tests for more concrete examples of how things work.

#### Example

````
<script>
  var fs = new IDBFS.FileSystem('local');
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
</script>
````

As with node.js, there is no guarantee that file system operations will be executed in the order they are invoked. Ensure proper ordering by chaining operations in callbacks.

### Tests

You can run the tests from the project by opening the `tests` directory in your browser. You can also run them [here](http://js-platform.github.io/idbfs/tests/).

### API Reference

Callbacks for methods that accept them are non-optional. The first callback parameter is reserved for passing errors. It will be `undefined` if no errors occurred and should always be checked.

#### IDBFS.FileSystem(name, flags)

File system constructor, invoked to open an existing file system or create a new one. Accepts a name and optional flags. Use `'FORMAT'` to force IDBFS for format the file system.

#### fs.stat(path, callback)

Asynchronous stat(2). Callback gets `(error, stats)`, where `stats` is an object like

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

#### fs.fstat(fd, callback)

Asynchronous stat(2). Callback gets `(error, stats)`. See `fs.stat`.

#### fs.link(oldpath, newpath, callback)

Asynchronous link(2). Callback gets no additional agruments.

#### fs.unlink(path, callback)

Asynchronous unlink(2). Callback gets no additional agruments.

#### fs.rmdir(path, callback)

Asynchronous rmdir(2). Callback gets no additional agruments.

#### fs.mkdir(path, callback)

Asynchronous mkdir(2). Callback gets no additional agruments.

#### fs.close(fd, callback)

Asynchronous close(2). Callback gets no additional agruments.

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
