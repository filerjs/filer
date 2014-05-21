/* jshint evil:true */
define(function(require) {

  var Path = require('src/path');
  var Errors = require('src/errors');
  var Environment = require('src/shell/environment');
  var async = require('async');
  var Network = require('src/network');

  require('zip');
  require('unzip');

  function Shell(fs, options) {
    options = options || {};

    var env = new Environment(options.env);
    var cwd = '/';

    /**
     * The bound FileSystem (cannot be changed)
     */
    Object.defineProperty(this, 'fs', {
      get: function() { return fs; },
      enumerable: true
    });

    /**
     * The shell's environment (e.g., for things like
     * path, tmp, and other env vars). Use env.get()
     * and env.set() to work with variables.
     */
    Object.defineProperty(this, 'env', {
      get: function() { return env; },
      enumerable: true
    });

    /**
     * Change the current working directory. We
     * include `cd` on the `this` vs. proto so that
     * we can access cwd without exposing it externally.
     */
    this.cd = function(path, callback) {
      path = Path.resolve(this.cwd, path);
      // Make sure the path actually exists, and is a dir
      fs.stat(path, function(err, stats) {
        if(err) {
          callback(new Errors.ENOTDIR());
          return;
        }
        if(stats.type === 'DIRECTORY') {
          cwd = path;
          callback();
        } else {
          callback(new Errors.ENOTDIR());
        }
      });
    };

    /**
     * Get the current working directory (changed with `cd()`)
     */
    this.pwd = function() {
      return cwd;
    };
  }

  /**
   * Execute the .js command located at `path`. Such commands
   * should assume the existence of 3 arguments, which will be
   * defined at runtime:
   *
   *   * fs - the current shell's bound filesystem object
   *   * args - a list of arguments for the command, or an empty list if none
   *   * callback - a callback function(error, result) to call when done.
   *
   * The .js command's contents should be the body of a function
   * that looks like this:
   *
   * function(fs, args, callback) {
   *   // .js code here
   * }
   */
  Shell.prototype.exec = function(path, args, callback) {
    var fs = this.fs;
    if(typeof args === 'function') {
      callback = args;
      args = [];
    }
    args = args || [];
    callback = callback || function(){};
    path = Path.resolve(this.cwd, path);

    fs.readFile(path, "utf8", function(error, data) {
      if(error) {
        callback(error);
        return;
      }
      try {
        var cmd = new Function('fs', 'args', 'callback', data);
        cmd(fs, args, callback);
      } catch(e) {
        callback(e);
      }
    });
  };

  /**
   * Create a file if it does not exist, or update access and
   * modified times if it does. Valid options include:
   *
   *  * updateOnly - whether to create the file if missing (defaults to false)
   *  * date - use the provided Date value instead of current date/time
   */
  Shell.prototype.touch = function(path, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};
    path = Path.resolve(this.cwd, path);

    function createFile(path) {
      fs.writeFile(path, '', callback);
    }

    function updateTimes(path) {
      var now = Date.now();
      var atime = options.date || now;
      var mtime = options.date || now;

      fs.utimes(path, atime, mtime, callback);
    }

    fs.stat(path, function(error, stats) {
      if(error) {
        if(options.updateOnly === true) {
          callback();
        } else {
          createFile(path);
        }
      } else {
        updateTimes(path);
      }
    });
  };

  /**
   * Concatenate multiple files into a single String, with each
   * file separated by a newline. The `files` argument should
   * be a String (path to single file) or an Array of Strings
   * (multiple file paths).
   */
  Shell.prototype.cat = function(files, callback) {
    var fs = this.fs;
    var all = '';
    callback = callback || function(){};

    if(!files) {
      callback(new Errors.EINVAL("Missing files argument"));
      return;
    }

    files = typeof files === 'string' ? [ files ] : files;

    function append(item, callback) {
      var filename = Path.resolve(this.cwd, item);
      fs.readFile(filename, 'utf8', function(error, data) {
        if(error) {
          callback(error);
          return;
        }
        all += data + '\n';
        callback();
      });
    }

    async.eachSeries(files, append, function(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, all.replace(/\n$/, ''));
      }
    });
  };

  /**
   * Get the listing of a directory, returning an array of
   * file entries in the following form:
   *
   * {
   *   path: <String> the basename of the directory entry
   *   links: <Number> the number of links to the entry
   *   size: <Number> the size in bytes of the entry
   *   modified: <Number> the last modified date/time
   *   type: <String> the type of the entry
   *   contents: <Array> an optional array of child entries
   * }
   *
   * By default ls() gives a shallow listing. If you want
   * to follow directories as they are encountered, use
   * the `recursive=true` option.
   */
  Shell.prototype.ls = function(dir, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!dir) {
      callback(new Errors.EINVAL("Missing dir argument"));
      return;
    }

    function list(path, callback) {
      var pathname = Path.resolve(this.cwd, path);
      var result = [];

      fs.readdir(pathname, function(error, entries) {
        if(error) {
          callback(error);
          return;
        }

        function getDirEntry(name, callback) {
          name = Path.join(pathname, name);
          fs.stat(name, function(error, stats) {
            if(error) {
              callback(error);
              return;
            }
            var entry = {
              path: Path.basename(name),
              links: stats.nlinks,
              size: stats.size,
              modified: stats.mtime,
              type: stats.type
            };

            if(options.recursive && stats.type === 'DIRECTORY') {
              list(Path.join(pathname, entry.path), function(error, items) {
                if(error) {
                  callback(error);
                  return;
                }
                entry.contents = items;
                result.push(entry);
                callback();
              });
            } else {
              result.push(entry);
              callback();
            }
          });
        }

        async.each(entries, getDirEntry, function(error) {
          callback(error, result);
        });
      });
    }

    list(dir, callback);
  };

  /**
   * Removes the file or directory at `path`. If `path` is a file
   * it will be removed. If `path` is a directory, it will be
   * removed if it is empty, otherwise the callback will receive
   * an error. In order to remove non-empty directories, use the
   * `recursive=true` option.
   */
  Shell.prototype.rm = function(path, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!path) {
      callback(new Errors.EINVAL("Missing path argument"));
      return;
    }

    function remove(pathname, callback) {
      pathname = Path.resolve(this.cwd, pathname);
      fs.stat(pathname, function(error, stats) {
        if(error) {
          callback(error);
          return;
        }

        // If this is a file, delete it and we're done
        if(stats.type === 'FILE') {
          fs.unlink(pathname, callback);
          return;
        }

        // If it's a dir, check if it's empty
        fs.readdir(pathname, function(error, entries) {
          if(error) {
            callback(error);
            return;
          }

          // If dir is empty, delete it and we're done
          if(entries.length === 0) {
            fs.rmdir(pathname, callback);
            return;
          }

          // If not, see if we're allowed to delete recursively
          if(!options.recursive) {
            callback(new Errors.ENOTEMPTY());
            return;
          }

          // Remove each dir entry recursively, then delete the dir.
          entries = entries.map(function(filename) {
            // Root dir entries absolutely
            return Path.join(pathname, filename);
          });
          async.each(entries, remove, function(error) {
            if(error) {
              callback(error);
              return;
            }
            fs.rmdir(pathname, callback);
          });
        });
      });
    }

    remove(path, callback);
  };

  /**
   * Gets the path to the temporary directory, creating it if not
   * present. The directory used is the one specified in
   * env.TMP. The callback receives (error, tempDirName).
   */
  Shell.prototype.tempDir = function(callback) {
    var fs = this.fs;
    var tmp = this.env.get('TMP');
    callback = callback || function(){};

    // Try and create it, and it will either work or fail
    // but either way it's now there.
    fs.mkdir(tmp, function(err) {
      callback(null, tmp);
    });
  };

  /**
   * Recursively creates the directory at `path`. If the parent
   * of `path` does not exist, it will be created.
   * Based off EnsureDir by Sam X. Xu
   * https://www.npmjs.org/package/ensureDir
   * MIT License
   */
  Shell.prototype.mkdirp = function(path, callback) {
    var fs = this.fs;
    callback = callback || function(){};

    if(!path) {
      callback(new Errors.EINVAL("Missing path argument"));
      return;
    }
    else if (path === '/') {
      callback();
      return;
    }
    function _mkdirp(path, callback) {
      fs.stat(path, function (err, stat) {
        if(stat) {
          if(stat.isDirectory()) {
            callback();
            return;
          }
          else if (stat.isFile()) {
            callback(new Errors.ENOTDIR());
            return;
          }
        }
        else if (err && err.code !== 'ENOENT') {
          callback(err);
          return;
        }
        else {
          var parent = Path.dirname(path);
          if(parent === '/') {
            fs.mkdir(path, function (err) {
              if (err && err.code != 'EEXIST') {
                callback(err);
                return;
              }
              callback();
              return;
            });
          }
          else {
            _mkdirp(parent, function (err) {
              if (err) return callback(err);
              fs.mkdir(path, function (err) {
                if (err && err.code != 'EEXIST') {
                  callback(err);
                  return;
                }
                callback();
                return;
              });
            });
          }
        }

      });
    }

    _mkdirp(path, callback);
  };

  /**
   * Downloads the file at `url` and saves it to the filesystem.
   * The file is saved to a file named with the current date/time
   * unless the `options.filename` is present, in which case that
   * filename is used instead. The callback receives (error, path).
   */
  Shell.prototype.wget = function(url, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!url) {
      callback(new Errors.EINVAL('missing url argument'));
      return;
    }

    // Grab whatever is after the last / (assuming there is one). Like the real
    // wget, we leave query string or hash portions in tact. This assumes a
    // properly encoded URL.
    // i.e. instead of "/foo?bar/" we would expect "/foo?bar%2F"
    var path = options.filename || url.split('/').pop();

    path = Path.resolve(fs.cwd, path);

    function onerror() {
      callback(new Error('unable to get resource'));
    }

    Network.download(url, function(err, data) {
      if (err || !data) {
        return onerror();
      }

      fs.writeFile(path, data, function(err) {
        if(err) {
          callback(err);
        } else {
          callback(null, path);
        }
      });
    });
  };

  Shell.prototype.unzip = function(zipfile, options, callback) {
    var fs = this.fs;
    var sh = this;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!zipfile) {
      callback(new Errors.EINVAL('missing zipfile argument'));
      return;
    }

    var path = Path.resolve(this.cwd, zipfile);
    var destination = Path.resolve(options.destination || this.cwd);

    fs.readFile(path, function(err, data) {
      if(err) return callback(err);

      var unzip = new Zlib.Unzip(data);

      // Separate filenames within the zip archive with what will go in fs.
      // Also mark any directories (i.e., paths with a trailing '/')
      var filenames = unzip.getFilenames().map(function(filename) {
        return {
          zipFilename: filename,
          fsFilename: Path.join(destination, filename),
          isDirectory: /\/$/.test(filename)
        };
      });

      function decompress(path, callback) {
        var data = unzip.decompress(path.zipFilename);
        if(path.isDirectory) {
          sh.mkdirp(path.fsFilename, callback);
        } else {
          fs.writeFile(path.fsFilename, data, callback);
        }
      }

      async.eachSeries(filenames, decompress, callback);
    });
  };

  Shell.prototype.zip = function(zipfile, paths, options, callback) {
    var fs = this.fs;
    var sh = this;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};

    if(!zipfile) {
      callback(new Errors.EINVAL('missing zipfile argument'));
      return;
    }
    if(!paths) {
      callback(new Errors.EINVAL('missing paths argument'));
      return;
    }
    if(typeof paths === 'string') {
      paths = [ paths ];
    }
    zipfile = Path.resolve(this.cwd, zipfile);

    function encode(s) {
      return new TextEncoder('utf8').encode(s);
    }

    function addFile(path, callback) {
      fs.readFile(path, function(err, data) {
        if(err) return callback(err);

        // Make path relative within the zip
        var relpath = path.replace(/^\//, '');
        zip.addFile(data, { filename: encode(relpath) });
        callback();
      });
    }

    function addDir(path, callback) {
      fs.readdir(path, function(err, list) {
        // Add the directory itself (with no data) and a trailing /
        zip.addFile([], {
          filename: encode(path + '/'),
          compressionMethod: Zlib.Zip.CompressionMethod.STORE
        });

        if(!options.recursive) {
          callback();
        }

        // Add all children of this dir, too
        async.eachSeries(list, function(entry, callback) {
          add(Path.join(path, entry), callback);
        }, callback);
      });
    }

    function add(path, callback) {
      path = Path.resolve(sh.cwd, path);
      fs.stat(path, function(err, stats) {
        if(err) return callback(err);

        if(stats.isDirectory()) {
          addDir(path, callback);
        } else {
          addFile(path, callback);
        }
      });
    }

    var zip = new Zlib.Zip();

    // Make sure the zipfile doesn't already exist.
    fs.stat(zipfile, function(err, stats) {
      if(stats) {
        return callback(new Errors.EEXIST('zipfile already exists'));
      }

      async.eachSeries(paths, add, function(err) {
        if(err) return callback(err);

        var compressed = zip.compress();
        fs.writeFile(zipfile, compressed, callback);
      });
    });
  };

  return Shell;

});
