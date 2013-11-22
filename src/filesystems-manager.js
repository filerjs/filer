define(function(require) {

  var guid = require('src/shared').guid;
  var FS_READY = require('src/constants').FS_READY;
  var FS_ERROR = require('src/constants').FS_ERROR;
  var EFileSystemError = require('src/error').EFileSystemError;

  var filesystems = {};

  function FileSystemWrapper(fs) {
    this.fs = fs;
    this.openFiles = {};
    this.nextDescriptor = 1;
    this.queue = [];
  }

  FileSystemWrapper.prototype.allocDescriptor = function(openFileDescription) {
    var fd = this.nextDescriptor ++;
    this.openFiles[fd] = openFileDescription;
    return fd;
  };

  FileSystemWrapper.prototype.releaseDescriptor = function(fd) {
    delete this.openFiles[fd];
  };

  FileSystemWrapper.prototype.queueOrRun = function(operation) {
    var error;
    var fs = this.fs;

    if(FS_READY == fs.readyState) {
      operation.call(fs);
    } else if(FS_ERROR == fs.readyState) {
      error = new EFileSystemError('unknown error');
    } else {
      this.queue.push(operation);
    }

    return error;
  };

  FileSystemWrapper.prototype.runQueued = function() {
    this.queue.forEach(function(operation) {
      operation.call(this);
    }.bind(this.fs));
    this.queue = null;
  };


  return {
    register: function(fs) {
      fs.id = guid();
      filesystems[fs.id] = new FileSystemWrapper(fs);
    },

    get: function(fs) {
      return filesystems[fs.id];
    }
  };
});
