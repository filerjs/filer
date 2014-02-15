/* jshint evil:true */
define(function(require) {

  var Path = require('src/path');

  function Shell(fs, options) {
    options = options || {};

    var cwd = options.cwd || '/';

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
    this.cd = function(path) {
      this.cwd = Path.resolve(this.cwd, path);
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
      fs.writeFile(path, '', function(error) {
        callback(error);
      });
    }

    function updateTimes(path) {
      var now = Date.now();
      var atime = options.date || now;
      var mtime = options.date || now;

      fs.utimes(path, atime, mtime, function(error) {
        callback(error);
      });
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

  return Shell;

});
