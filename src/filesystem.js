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

  function DirectoryError(code) {
    this.code = code;
    // FIXME: add a message field with the text error
  };
  DirectoryError.PATH_EXISTS_ERR = 1;
  DirectoryError.MISSING_PATH_COMPONENT_ERR = 2;

  var RO = "readonly",
      RW = "readwrite";

  function FileSystem(name, optFormat) {
    var fs = this;
    fs.OBJECT_STORE_NAME = "files";
    fs.name = name || "default";    
    fs.pending = {};

    fs.state = FileSystem.UNINITIALIZED;
    var deferred;
    fs.then;
    fs.db;

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

    var format = undefined !== optFormat ? optFormat : false;
    var deferred = when.defer();
    fs.then = deferred.promise.then;

    updateState();
    var openRequest = queuePending(indexedDB.open(name));
    fs.state = FileSystem.PENDING;

    openRequest.onsuccess = function(e) {
      fs.db = e.target.result;
      var db = fs.db;
      var transaction = db.transaction([fs.OBJECT_STORE_NAME], RW);
      var store = transaction.objectStore(fs.OBJECT_STORE_NAME);
      if(format) {
        debug.info("format required");        
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
      store.createIndex("parent", "parent", {unique: false});
      store.createIndex("name", "name", {unique: true});

      format = true;
    };

    openRequest.onerror = function(e) {
      clearPending(openRequest);
    };

    // API

    this.mkdir = function mkdir(path) {
      debug.info("mkdir");
      var db = fs.db;
      var d = when.defer();
      var transaction = db.transaction([this.OBJECT_STORE_NAME], RW);
      var store = transaction.objectStore(fs.OBJECT_STORE_NAME);      
      var nameIndex = store.index("name");

      var getRequest = queuePending(nameIndex.get(path));
      getRequest.onsuccess = function(e) {
        clearPending(getRequest);
        var result = e.target.result;
        if(result) {
          debug.info("mkdir PATH_EXISTS_ERR");
          d.reject(new DirectoryError(DirectoryError.PATH_EXISTS_ERR));
        } else {
          var directoryRequest = queuePending(store.put({}, path));
          directoryRequest.onsuccess = function(e) {
            debug.info("mkdir complete");
            clearPending(directoryRequest);
            d.resolve();
          };
        }
      };
      return d.promise;
    }
  }
  FileSystem.READY = 0;
  FileSystem.PENDING = 1;
  FileSystem.UNINITIALIZED = 2;

  return FileSystem;

});