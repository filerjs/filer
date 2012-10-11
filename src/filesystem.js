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
  // 'use strict';

  var debug = require("debug");
  var _ = require("lodash");
  var path = require("src/path");

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;

  function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  function makeDirectoryEntry(name, modtime) {
    var parent = path.dirname(name);
    return {
      "parent": parent,
      "name": name,
      "content-type": "application/directory",
      "last-modified": modtime || Date.now()
    }
  }

  function makeFileEntry(name, oid, size, modtime) {
    var parent = path.dirname(name);
    return {
      "parent": parent,
      "name": name,
      "content-type": "application/file",
      "last-modified": modtime || Date.now(),
      "size": size || 0,
      "object-id": oid || guid()
    }
  }

/*
  function FileSystem(name, optFormat) {
    function Transaction(db, scope, mode) {
      var id = this.id = guid();
      this._IdbTransaction = db.transaction(scope, mode);
      var deferred = when.defer();
      this._IdbTransaction.oncomplete = function(e) {
        deferred.resolve(e);
        clearPending(id);
      };
      this._IdbTransaction.onerror = function(e) {
        deferred.reject(e);
        clearPending(id);
      };
      this.then = deferred.promise.then;
      this.objectStore = this._IdbTransaction.objectStore.bind(this._IdbTransaction);
      this.abort = this._IdbTransaction.abort.bind(this._IdbTransaction);
      queuePending(this, id);
    }

    function Request(request) {
      var id = this.id = guid();
      this._IdbRequest = request;
      var deferred = when.defer();
      this._IdbRequest.onsuccess = function(e) {
        deferred.resolve(e);
        // clearPending(id);
      };
      this._IdbRequest.onerror = function(e) {
        deferred.reject(e);
        // clearPending(id);
      };
      this.then = deferred.promise.then;
      // queuePending(this, id);
    }

    function OpenDBRequest(request, upgrade) {
      var id = this.id = guid();
      this._IdbRequest = request;
      var deferred = when.defer();
      this._IdbRequest.onsuccess = function(e) {
        deferred.resolve(e);
        clearPending(id);
      };
      this._IdbRequest.onerror = function(e) {
        deferred.reject(e);
        clearPending(id);
      };
      if(typeof upgrade === "function") {
        this._IdbRequest.onupgradeneeded = upgrade;
      }
      this.then = deferred.promise.then;
      queuePending(this, id);
    }

    var fs = this;
    fs.id = guid();
    var FILE_STORE_NAME = "files";
    var METADATA_STORE_NAME = "metadata";
    var NAME_INDEX = "name";
    var PARENT_INDEX = "parent";
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

    function queuePending(transaction, id) {
      fs.pending[id] = transaction;
      updateState();
      return transaction;
    }

    function clearPending(id) {
      if(fs.pending.hasOwnProperty(id)) {
        delete fs.pending[id];
      }
      updateState();
    } 

    var format = undefined !== optFormat ? optFormat : false;
    var deferred = when.defer();
    fs.then = deferred.promise.then;

    updateState();
    var openRequest = new OpenDBRequest(indexedDB.open(name), function(e) {
      var db = fs.db = e.target.result;
      if(db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.deleteObjectStore(METADATA_STORE_NAME);
      }
      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      var metadata = db.createObjectStore(METADATA_STORE_NAME);
      metadata.createIndex(NAME_INDEX, "parent", {unique: false});
      metadata.createIndex(NAME_INDEX, "name", {unique: true});
      var files = db.createObjectStore(FILE_STORE_NAME);

      format = true;
    });
    openRequest.then(function(e) {
      fs.db = e.target.result;
      var db = fs.db;
      var transaction = new Transaction(db, [METADATA_STORE_NAME], RW);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      if(format) {
        debug.info("format required");
        var clearRequest = new Request(store.clear());
        clearRequest.then(function() {
          mkdir(transation, "/").then(function() {
            debug.info("format complete");
          });
        });
      }
    });

    // API

    function updateLastModified(transaction, name, timestamp) {
      debug.info("updateLastModified invoked");
      var deferred = when.defer();
      transaction = transaction || new Transaction(fs.db, [METADATA_STORE_NAME], RW);
      timestamp = timestamp || Date.now();
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);      

      var getRequest = new Request(nameIndex.get(name));
      getRequest.then(function(e) {
        var result = e.target.result;
        if(!result) {
          debug.info("updateLastModified error: E_NOENT");
          deferred.reject(new FileSystemError(T_NONE, E_NOENT));
        } else {          
          result["last-modified"] = timestamp;
          var updateRequest = new Request(store.put(result, result.name));    
          updateRequest.then(function(e) {
            debug.info("updateLastModified complete");
            deferred.resolve();
          });
        }
      });
      return deferred.promise;
    }


    function mkdir(transaction, name) {
      debug.info("mkdir invoked");
      var deferred = when.defer();      
      transaction = transaction || new Transaction(fs.db, [METADATA_STORE_NAME], RW);
      var store = transaction.objectStore(METADATA_STORE_NAME);      
      var nameIndex = store.index(NAME_INDEX);

      var getRequest = new Request(nameIndex.get(name));
      getRequest.then(function(e) {
        var result = e.target.result;
        if(result) {
          debug.info("mkdir error: E_EXIST");
          deferred.reject(new FileSystemError(T_MKDIR, E_EXIST));
        } else {
          var entry = makeDirectoryEntry(name, Date.now());
          var directoryRequest = new Request(store.put(entry, name));
          directoryRequest.then(function(e) {
            debug.info("mkdir complete");
            deferred.resolve();
          }, function(e) {
            debug.info("mkdir error: " + e);
            deferred.reject(e);
          });
        }
      });
      return deferred.promise;
    }
    fs.mkdir = mkdir.bind(null, null);

    function stat(transaction, name) {
      debug.info("stat invoked");
      var deferred = when.defer();
      transaction = transaction || new Transaction(fs.db, [METADATA_STORE_NAME], RO);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);

      var getRequest = new Request(nameIndex.get(name));      
      getRequest.then(function(e) {        
        var result = e.target.result;
        if(!result) {
          debug.info("stat error: E_NOENT");
          deferred.reject(new FileSystemError(T_STAT, E_NOENT));
        } else {
          debug.info("stat complete");
          deferred.resolve(result);
        }
      });
      return deferred.promise;
    }
    fs.stat = stat.bind(null, null);

    function OpenFileDescription(filesystem, name, oid, flags, mode) {
      this.fs = filesystem;
      this.name = name;      
      this.oid = oid;
      this.fags = flags;
      this.mode = mode;
      this.offset = 0;
    }

    var fds = {};
    function FileDescriptor(ofd) {
      this.descriptor = guid();
      fds[this.descriptor] = ofd;
    }
    // Close a file
    FileDescriptor.prototype.close = function close() {
      debug.info("close invoked");
      var deferred = when();
      delete fds[this.descriptor];
      debug.info("close complete");
      return deferred.promise;
    };
    // Read from a file
    FileDescriptor.prototype.read = function read(bytes, buffer) {

    };
    // Write to a file
    FileDescriptor.prototype.write = function write(bytes, buffer) {

    };
    // Set absolute offset
    FileDescriptor.prototype.seek = function seek(offset) {
      this.offset = offset;
    };
    // Set relative offset (from current offset)
    FileDescriptor.prototype.rseek = function rseek(offset) {
      this.offset += offset;
    };

    function open(name, flags, mode) {
      debug.info("open invoked");
      var deferred = when.defer();
      var transaction = new Transaction(fs.db, [METADATA_STORE_NAME], RW);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);

      var metadataRequest = new Request(nameIndex.get(name));
      metadataRequest.then(function(e) {
        var result = e.target.result;
        if(!result && !(flags & FileSystem.O_CREATE)) {
          debug.info("open error: E_NOENT");
          deferred.reject(new FileSystemError(T_OPEN, E_NOENT));
        } else if(result && "application/directory" === result["content-type"] && mode === FileSystem.FMODE_RW) {
          debug.info("open error: E_ISDIR");
          deferred.reject(new FileSystemError(T_OPEN, E_ISDIR));
        } else {          
          function complete() {
            var ofd = new OpenFileDescription(fs, name, result["object-id"], flags, mode);
            var fd = new FileDescriptor(ofd);
            debug.info("open complete");
            deferred.resolve(fd);
          }
          if(!result) {
            result = makeFileEntry(name);
            var makeRequest = new Request(store.put(result, name));
            makeRequest.then(complete);
          } else {
            complete();
          }
        }
      });
      return deferred.promise;
    }
    fs.open = open;

    function dump(element) {
      element.innerHTML = "";
      var transaction = new Transaction(fs.db, [METADATA_STORE_NAME], RO);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var cursorRequest = store.openCursor();
      cursorRequest.onsuccess = function(e) {
        var cursor = e.target.result;
        if(cursor) {
          var getRequest = store.get(cursor.key);
          getRequest.onsuccess = function(e) {
            var result = e.target.result;
            element.innerHTML += JSON.stringify(result) + "<br>";
            cursor.continue();
          };
        }
      };
    }
    this.dump = dump;
  }
  // File system states
  FileSystem.READY = 0;
  FileSystem.PENDING = 1;
  FileSystem.UNINITIALIZED = 2;
  // Open flags
  FileSystem.O_CREATE = 0x1;
  FileSystem.O_TRUNCATE = 0x2;
  // Open modes
  FileSystem.FMODE_RO = 0;
  FileSystem.FMODE_RW = 1;
*/
  /////////////////////////////////////////////////////////////////////////////

  var METADATA_STORE_NAME = "metadata";
  var FILE_STORE_NAME = "files";
  var NAME_INDEX = "name";
  var NAME_INDEX_KEY_PATH = "name";
  var PARENT_INDEX = "parent";
  var PARENT_INDEX_KEY_PATH = "parent";
  var MIME_DIRECTORY = "application/directory";
  var MIME_FILE = "application/file";

  var IDB_RO = "readonly";
  var IDB_RW = "readwrite";

  function IDBFSError(type, code) {
    this.type = type;
    this.code = code;
  }
  // Types
  var T_NONE = 0x0;
  var T_OPEN = 0x1;
  var T_MKDIR = 0x2;
  var T_STAT = 0x3;
  var T_RMDIR = 0x4;  
  // Codes
  var E_EXIST = 0x0;
  var E_ISDIR = 0x1;
  var E_NOENT = 0x2;
  var E_BUSY = 0x3;
  var E_NOTEMPTY = 0x4;

  function genericIDBErrorHandler(scope, callback) {
    return function(error) {
      debug.error("[" + scope + "] error: ", error);
      if(callback && "function" === typeof callback) {
        callback.call(undefined, error);
      }
    }
  }

  function FileSystem(db) {
    var fs = this;
    var pending = {}; // Pending transactions
    var fds = {}; // Open file descriptors

    // Internal prototypes

    function OpenFileDescription(name, oid, flags, mode) {
      this.fs = filesystem;
      this.name = name;      
      this.oid = oid;
      this.flags = flags;
      this.mode = mode;
      this.pointer = 0;
    }

    function FileDescriptor(ofd) {
      this.descriptor = guid();
      fds[this.descriptor] = ofd;

      function read(buffer, bytes, callback) {

      }

      function write(buffer, bytes, callback) {

      }

      function seek(offset, whence, callback) {

      }
    }

    // API

    // Flags: CREATE, APPEND, TRUNCATE, DIRECTORY
    // Modes: RO, RW
    function open(pathname, flags, mode, callback) {

    }

    function close(fd, callback) {

    }

    function mkdir(transaction, pathname, callback) {      
      debug.info("mkdir -->");
      pathname = path.normalize(pathname);
      transaction = transaction || db.transaction([METADATA_STORE_NAME], IDB_RW);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);
      var onerror = genericIDBErrorHandler("mkdir", callback);

      var getRequest = nameIndex.get(pathname);
      getRequest.onsuccess = function(e) {
        var result = e.target.result;
        if(result) {
          onerror(new IDBFSError(T_MKDIR, E_EXIST));
        } else {
          var entry = makeDirectoryEntry(pathname, Date.now());
          var directoryRequest = store.put(entry, pathname);
          directoryRequest.onsuccess = function(e) {
            debug.info("mkdir <--");
            if(callback && "function" === typeof callback) {              
              callback.call(undefined, undefined);
            }
          };
          directoryRequest.onerror = onerror;
        }
      };
      getRequest.onerror = onerror;
    }

    function rmdir(pathname, callback) {
      debug.info("rmdir -->");
      pathname = path.normalize(pathname);
      transaction = db.transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);
      var metaStore = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = metaStore.index(NAME_INDEX);
      var parentIndex = metaStore.index(PARENT_INDEX);
      var onerror = genericIDBErrorHandler("rmdir", callback);

      var getRequest = nameIndex.get(pathname);
      getRequest.onsuccess = function(e) {
        var result = e.target.result;
        if(!result) {
          onerror(new IDBFSError(T_RMDIR, E_NOENT));
          return;
        } else {
          var contentRequest = parentIndex.get(pathname);
          contentRequest.onsuccess = function(e) {
            var result = e.target.result;
            if(result) {
              onerror(new IDBFSError(T_RMDIR, E_NOTEMPTY));
              return;
            } else {
              var removeRequest = metaStore.delete(pathname);
              removeRequest.onsuccess = function(e) {
                debug.info("rmdir <--");
                if(callback && "function" === typeof callback) {              
                  callback.call(undefined, undefined);
                }
              };
              removeRequest.onerror = onerror;
            }
          };
          contentRequest.onerror = onerror;
        }
      };
      getRequest.onerror = onerror;
    }

    function stat(transaction, pathname, callback) {
      debug.info("stat -->");
      pathname = path.normalize(pathname);
      transaction = transaction || db.transaction([METADATA_STORE_NAME], IDB_RO);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);
      var onerror = genericIDBErrorHandler("stat", callback);

      var getRequest = nameIndex.get(pathname);
      getRequest.onsuccess = function(e) {        
        var result = e.target.result;
        if(!result) {
          onerror(new IDBFSError(T_STAT, E_NOENT));
          return;
        } else {
          debug.info("stat <--");
          if(callback && "function" === typeof callback) {              
            callback.call(undefined, undefined, result);
          }
        }
      };
    }

    function link(oldpath, newpath, callback) {

    }

    function unlink(pathname, callback) {

    }

    function api() {
      return {
        open: open,
        close: close,
        mkdir: mkdir.bind(null, null),
        rmdir: rmdir,
        stat: stat.bind(null, null),
        link: link,
        unlink: unlink,
        dump: dump
      }
    }

    this.open = open;
    this.close = close;
    this.mkdir = mkdir;
    this.rmdir = rmdir;
    this.stat = stat;
    this.link = link;
    this.unlink = unlink;
    this.api = api;

    // DEBUG
    function dump(element) {
      element.innerHTML = "";
      var transaction = db.transaction([METADATA_STORE_NAME], IDB_RO);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var cursorRequest = store.openCursor();
      cursorRequest.onsuccess = function(e) {
        var cursor = e.target.result;
        if(cursor) {
          var getRequest = store.get(cursor.key);
          getRequest.onsuccess = function(e) {
            var result = e.target.result;
            element.innerHTML += JSON.stringify(result) + "<br>";
            cursor.continue();
          };
        }
      };
    }
    this.dump = dump;
  }

  function mount(name, callback, optFormat) {
    debug.info("mount -->");
    optFormat = (undefined === optFormat) ? false : optFormat;
    var onerror = genericIDBErrorHandler("mount", callback);
    var openRequest = indexedDB.open(name);
    openRequest.onupgradeneeded = function(e) {
      var db = e.target.result;
      if(db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.deleteObjectStore(METADATA_STORE_NAME);
      }
      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      var metadata = db.createObjectStore(METADATA_STORE_NAME);
      metadata.createIndex(PARENT_INDEX, PARENT_INDEX_KEY_PATH, {unique: false});
      metadata.createIndex(NAME_INDEX, NAME_INDEX_KEY_PATH, {unique: true});
      var files = db.createObjectStore(FILE_STORE_NAME);

      optFormat = true;
    };
    openRequest.onsuccess = function(e) {
      var db = e.target.result;
      var fs = new FileSystem(db);

      if(optFormat) {
        var transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
        var store = transaction.objectStore(METADATA_STORE_NAME);
        debug.info("format -->");
        var clearRequest = store.clear();
        clearRequest.onsuccess = function() {
          fs.mkdir(transaction, "/", function(error) {
            if(error) {
              onerror(error);
            } else {
              debug.info("format <--");
              debug.info("mount <--");
              if(callback && "function" === typeof callback) {
                callback.call(undefined, undefined, fs.api());
              }
            }            
          });
        };
        clearRequest.onerror = onerror;
      } else {
        debug.info("mount <--");
        if(callback && "function" === typeof callback) {
          callback.call(undefined, undefined, fs.api());
        }
      }
    };
    openRequest.onerror = onerror;
  }

  function umount(fs, callback) {

  }

  var IDBFS = {
    mount: mount,
    umount: undefined,
    path: path
  };

  return IDBFS;

});