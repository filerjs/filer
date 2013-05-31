define(function(require) {

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  var _ = require('lodash');
  var when = require('when');

  var guid = require('src/shared').guid;
  var hash = require('src/shared').hash;
  var nop = require('src/shared').nop;

  var EPathExists = require('src/error').EPathExists;
  var EIsDirectory = require('src/error').EIsDirectory;
  var ENoEntry = require('src/error').ENoEntry;
  var EBusy = require('src/error').EBusy;
  var ENotEmpty = require('src/error').ENotEmpty;
  var ENotDirectory = require('src/error').ENotDirectory;
  var EBadFileDescriptor = require('src/error').EBadFileDescriptor;
  var ENotImplemented = require('src/error').ENotImplemented;
  var ENotMounted = require('src/error').ENotMounted;
  var EFileExists = require('src/error').EFileExists;

  var FS_FORMAT = require('src/constants').FS_FORMAT;

  var IDB_RW = require('src/constants').IDB_RW;
  var IDB_RO = require('src/constants').IDB_RO;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;
  var METADATA_STORE_NAME = require('src/constants').METADATA_STORE_NAME;
  var FS_READY = require('src/constants').READY;
  var FS_PENDING = require('src/constants').FS_PENDING;
  var FS_ERROR = require('src/constants').FS_ERROR;

  var make_root_directory = require('src/directory').make_root_directory;
  var make_directory = require('src/directory').make_directory;
  var remove_directory = require('src/directory').remove_directory;

  var open_file = require('src/file').open_file;

  /*
   * FileSystem
   */

  function FileSystem(name, flags) {
    var format = _(flags).contains(FS_FORMAT);
    var that = this;

    var deferred = when.defer();
    this.promise = deferred.promise;

    var openRequest = indexedDB.open(name);
    openRequest.onupgradeneeded = function onupgradeneeded(event) {
      var db = event.target.result;

      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      var files = db.createObjectStore(FILE_STORE_NAME);

      if(db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.deleteObjectStore(METADATA_STORE_NAME);
      }
      var metadata = db.createObjectStore(METADATA_STORE_NAME);

      format = true;
    };
    openRequest.onsuccess = function onsuccess(event) {
      var db = event.target.result;

      function complete(error) {
        if(error) {
          that.readyState = FS_ERROR;
          deferred.reject(error);
        } else {
          that.readyState = FS_READY;
          that.db = db;
          deferred.resolve();
        }
      };

      if(format) {
        var transaction = db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);

        var clearRequest = files.clear();
        clearRequest.onsuccess = function onsuccess(event) {
          make_root_directory(files, complete);
        };
        clearRequest.onerror = function onerror(error) {
          complete(error);
        };
      } else {
        complete();
      }
    };
    openRequest.onerror = function onerror(error) {
      this.readyState = FS_ERROR;
      deferred.reject(error);
    };

    this.readyState = FS_PENDING;
    this.db = null;
  };
  FileSystem.prototype.open = function open(path, flags, mode) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error, fd) {
      if(error) {
        if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    };

    open_file(files, path, flags, mode, check_result);

    return deferred.promise;
  };
  FileSystem.prototype.opendir = function opendir(path) {

  };
  FileSystem.prototype.mkdir = function mkdir(path) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error) {
      if(error) {
        if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    };

    make_directory(files, path, check_result);
    return deferred.promise;
  };
  FileSystem.prototype.rmdir = function rmdir(path) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error) {
      if(error) {
        if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    };

    remove_directory(files, path, check_result);
    return deferred.promise;
  };
  FileSystem.prototype.stat = function stat(path) {

  };
  FileSystem.prototype.link = function link(oldpath, newpath) {

  };
  FileSystem.prototype.unlink = function unlink(path) {

  };
  FileSystem.prototype.getxattr = function getxattr(path, name) {

  };
  FileSystem.prototype.setxattr = function setxattr(path, name, value) {

  };

  return {
    FileSystem: FileSystem,
  };

});