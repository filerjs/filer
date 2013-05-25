define function(require) {

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  var _ = require('lodash');
  var when = require('when');
  var Path = require('src/path');

  var METADATA_STORE_NAME = 'metadata';
  var FILE_STORE_NAME = 'files';

  var IDB_RO = 'readonly';
  var IDB_RW = 'readwrite';

  function Operation(fs, stores, mode) {

  };

  var FS_FORMAT = 'format';
  function FileSystem(name, flags) {
    var format = _(flags).contains(FS_FORMAT);

    var openRequest = indexedDB.open(name);
  };
  FileSystem.prototype.open = function open(transaction, path, flags, mode) {

  };
  FileSystem.prototype.opendir = function opendir(transaction, path) {

  };
  FileSystem.prototype.mkdir = function mkdir(transaction, path) {

  };
  FileSystem.prototype.rmdir = function rmdir(transaction, path) {

  };
  FileSystem.prototype.stat = function stat(transaction, path) {

  };
  FileSystem.prototype.link = function link(transaction, oldpath, newpath) {

  };
  FileSystem.prototype.unlink = function unlink(transaction, path) {

  };
  FileSystem.prototype.getxattr = function getxattr(transaction, path, name) {

  };
  FileSystem.prototype.setxattr = function setxattr(transaction, path, name, value) {

  };

  return {
    FileSystem: FileSystem
  };

};