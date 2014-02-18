/* jshint evil:true */
define(function(require) {

  var Path = require('src/path');
  var FilerError = require('src/error');
  var async = require('async');

  function Shell(fs, options) {
    options = options || {};

    var cwd = '/';

    Object.defineProperty(this, 'fs', {
      get: function() { return fs; },
      enumerable: true
    });

    Object.defineProperty(this, 'cwd', {
      get: function() { return cwd; },
      enumerable: true
    });

    // We include `cd` on the this vs. proto so that
    // we can access cwd without exposing it externally.
    this.cd = function(path, callback) {
      path = Path.resolve(this.cwd, path);
      // Make sure the path actually exists, and is a dir
      fs.stat(path, function(err, stats) {
        if(err) {
          callback(new FilerError.ENotDirectory());
          return;
        }
        if(stats.type === 'DIRECTORY') {
          cwd = path;
          callback();
        } else {
          callback(new FilerError.ENotDirectory());
        }
      });
    };
  }

  /**
   * Execute the .js command located at `path`. Such commands
   * should assume the existence of 3 arguments, which will be
   * defined at runtime:
   *
   *   * options - an object containing any arguments, data, etc.
   *   * callback - a callback function(error, result) to call when done.
   *
   * The .js command's contents should be the body of a function
   * that looks like this:
   *
   * function(fs, options, callback) {
   *   // .js code here
   * }
   */
  Shell.prototype.exec = function(path, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || function(){};
    path = Path.resolve(this.cwd, path);

    fs.readFile(path, "utf8", function(error, data) {
      if(error) {
        callback(error);
        return;
      }
      try {
        var cmd = new Function('fs', 'options', 'callback', data);
        cmd(fs, options, callback);
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
    if(!files) {
      callback(new Error("Missing files argument"));
      return;
    }

    var fs = this.fs;
    var all = '';
    files = typeof files === 'string' ? [ files ] : files;
    callback = callback || function(){};

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

  return Shell;

});
