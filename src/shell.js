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

    };

  }

  Shell.prototype.ls = function(path) {

  };

  Shell.prototype.rm = function(path, options, callback) {

  };

  Shell.prototype.mv = function(path) {

  };

  Shell.prototype.cp = function(path) {

  };

  Shell.prototype.mkdir = function(path) {

  };

  /**
   * Create a file if it does not exist, or update access and
   * modified times if it does. Valid options include:
   *
   *  * create - whether to create the file if missing (defaults to true)
   *  * date - use the provided Date value instead of current date/time
   */
  Shell.prototype.touch = function(path, options, callback) {
    var fs = this.fs;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
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
        // Skip file creation if create is `false`
        if(options.create === false) {
          callback();
        } else {
          createFile(path);
        }
      } else {
        updateTimes(path);
      }
    });
  };

  Shell.prototype.ln = function(path) {

  };

  return Shell;

});
