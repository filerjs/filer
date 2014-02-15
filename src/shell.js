define(function(require) {

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

  Shell.prototype.touch = function(path, options, callback) {
    var fs = this.fs;
    path = Path.resolve(this.cwd, path);

    function createFile(path) {
      fs.writeFile(path, '', function(error) {
        callback(error);
      });
    }

    function updateTimes(path) {
      var now = Date.now();
      fs.utimes(path, now, now, function(error) {
        callback(error);
      });
    }

    fs.stat(path, function(error, stats) {
      if(error) {
        createFile(path);
      } else {
        updateTimes(path);
      }
    });
  };

  Shell.prototype.ln = function(path) {

  };

  return Shell;

});
