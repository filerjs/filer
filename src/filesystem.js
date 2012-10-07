/*
Copyright (c) 2012, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

define(function(require) {
  'use strict';

  var when = require("when");
  var debug = require("debug");

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;

  var TEMPORARY = 0;
  var PERSISTENT = 1;

  function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  function FileError(code) {
    this.code = code;
    // FIXME: add a message field with the text error
  };
  FileError.NOT_FOUND_ERR = 1;
  FileError.SECURITY_ERR = 2;
  FileError.ABORT_ERR = 3;
  FileError.NOT_READABLE_ERR = 4;
  FileError.ENCODING_ERR = 5;
  FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
  FileError.INVALID_STATE_ERR = 7;
  FileError.SYNTAX_ERR = 8;
  FileError.INVALID_MODIFICATION_ERR = 9;
  FileError.QUOTA_EXCEEDED_ERR = 10;
  FileError.TYPE_MISMATCH_ERR = 11;
  FileError.PATH_EXISTS_ERR = 12;

  function Entry() {}
  Entry.prototype.move = function move(parent, newName, successCallback, errorCallback) {
  };
  Entry.prototype.copy = function copy(parent, newName, successCallback, errorCallback) {
  };
  Entry.prototype.remove = function remove(successCallback, errorCallback) {
  };
  Entry.prototype.getParent = function getParent(successCallback, errorCallback) {
  };
  Entry.prototype.getMetadata = function getMetadata(successCallback, errorCallback) {
  };
  /*Entry.prototype.toUrl = function toUrl(mimeType) {
  };*/

  function DirectoryEntry(fs, path, name, parent) {
    this.isFile = false;
    this.isDirectory = true;
    this.name = name;
    this.path = path; // FIXME: account for the parent path
    this.filesystem = fs;
    this.parent = parent;
  }
  DirectoryEntry.prototype = new Entry();
  DirectoryEntry.prototype.createReader = function createReader() {
  };
  DirectoryEntry.prototype.removeRecursively = function removeRecursively(successCallback, errorCallback) {
  };
  DirectoryEntry.prototype.getFile = function getFile(path, options, successCallback, errorCallback) {
  };
  DirectoryEntry.prototype.getDirectory = function getDirectory(path, options, successCallback, errorCallback) {
  };

  function FileEntry(fs, path, name, parent) {
    this.isFile = true;
    this.isDirectory = false;
    this.name = name;
    this.path = path; // FIXME: account for the parent path
    this.filesystem = fs;
    this.parent = parent;
  }
  FileEntry.prototype = new Entry();
  FileEntry.prototype.createWriter = function createWriter(successCallback, errorCallback) {    
  };
  FileEntry.prototype.file = function file(successCallback, errorCallback) {
  };

  var RO = "readonly",
      RW = "readwrite";

  function FileSystem(name, optFormat) {
    var fs = this;
    var FILES = "files";
    fs.name = name || "default";    
    fs.pending = {};

    fs.state = FileSystem.UNINITIALIZED;
    var deferred;
    fs.then;
    fs.root;

    function updateState() {
      if(FileSystem.READY === fs.state && Object.keys(fs.pending).length > 0) {
        debug.info("filesystem has pending requests");
        fs.state = FileSystem.PENDING;
        deferred = when.defer();
        fs.then = deferred.promise.then;
      } else if(FileSystem.PENDING === fs.state && Object.keys(fs.pending).length === 0) {
        debug.info("filesystem is ready");
        fs.state = FileSystem.READY;
        deferred.resolve(fs);
      } else if(FileSystem.UNINITIALIZED === fs.state) {
        // Start the file system in the READY state and provide an initial resolved promise
        fs.state = FileSystem.READY;
        deferred = when.defer();        
        fs.then = deferred.promise.then;
        deferred.resolve(fs);
        debug.info("filesystem is initialized");
      }
    }

    function queuePending(request) {
      var id = guid();
      request.id = id;
      fs.pending[id] = request;
      updateState();
      return request;
    }

    function clearPending(request) {
      var id = request.id;
      if(fs.pending.hasOwnProperty(id)) {
        delete fs.pending[id];
      }
      delete request.id;
      updateState();
      return request;
    } 

    var db;
    var format = undefined !== optFormat ? optFormat : false;
    var deferred = when.defer();
    fs.then = deferred.promise.then;

    updateState();
    var openRequest = queuePending(indexedDB.open(name));
    fs.state = FileSystem.PENDING;

    openRequest.onsuccess = function(e) {
      db = e.target.result;
      if(format) {
        debug.info("format required");
        var transaction = db.transaction([FILES], RW);
        var store = transaction.objectStore(FILES);
        var formatRequest = queuePending(store.put({}, "/"));
        formatRequest.onsuccess = function(e) {
          debug.info("format complete");
          clearPending(formatRequest);
        };
      }
      clearPending(openRequest);
    };

    openRequest.onupgradeneeded = function(e) {
      db = e.target.result;
      if(db.objectStoreNames.contains("files")) {
          db.deleteObjectStore("files");
      }
      var store = db.createObjectStore("files");
      store.createIndex("parent", "parent");
      store.createIndex("name", "name");

      format = true;
    };

    openRequest.onerror = function(e) {
      clearPending(openRequest);
    };
  }
  FileSystem.READY = 0;
  FileSystem.PENDING = 1;
  FileSystem.UNINITIALIZED = 2;

  return FileSystem;

});