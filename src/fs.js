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

  var when = require("when");
  var _ = require("lodash");
  var path = require("src/path");
  var guid = require("src/guid");

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  var METADATA_STORE_NAME = "metadata";
  var FILE_STORE_NAME = "files";  
  var PARENT_INDEX = "parent";
  var PARENT_INDEX_KEY_PATH = "parent";

  var IDB_RO = "readonly";
  var IDB_RW = "readwrite";

  function parseFlags(flags) {
    var i;
    if(undefined === flags) {
      return [];
    } else if("string" === typeof flags) {
      flags = flags.split(",");
      for(i = 0, l = flags.length; i < l; ++ i) {
        flags[i] = flags[i].trim().toUpperCase();
      }
      return flags;
    }    
  }

  function runCallback(callback) {
    if("function" === typeof callback) {
      callback.apply(undefined, arguments);
    }
  }

  function Data(handle, bytes) {
    return {
      handle: handle || guid(),
      bytes: bytes || undefined
    }
  }

  function File(handle, size, atime, ctime, mtime, nlinks, type, flags, data, xattrs) {
    var now = Date.now();
    return {
      handle: handle || guid(),
      size: size || 0,
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      type: type || "application/octet-stream",
      flags: flags || "",      
      xattrs: xattrs || {},
      data: data || guid()
    }
  }

  var FILE_ENTRY_MIME_TYPE = "application/file-entry";
  function FileEntry(fullpath, file) {
    return {
      name: fullpath,
      parent: path.dirname(fullpath),
      file: file,
      type: FILE_ENTRY_MIME_TYPE
    }
  }

  var DIRECTORY_ENTRY_MIME_TYPE = "application/directory-entry";
  function DirectoryEntry(fullpath, atime, ctime, mtime, xattrs) {
    var now = Date.now();
    return {
      name: fullpath,
      parent: path.dirname(fullpath),
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      xattrs: xattrs || {},
      type: DIRECTORY_ENTRY_MIME_TYPE
    }
  }

  function FileSystem(db) {
    this._db = db;
    this._deferred = when.defer();
    this._deferred.resolve();
    this._pending = 0;
    this._mounted = true;

    this.Context = FileSystemContext.bind(this);
  }
  FileSystem.prototype._request = function _request(transaction) {
    var fs = this;
    if(!fs._pending) {
      fs._deferred = when.defer();
    }
    ++ fs._pending;
    transaction.oncomplete = function(e) {
      -- fs._pending;
      if(!fs._pending) {
        fs._deferred.resolve();
      }
    }
  };
  FileSystem.prototype.open = function open(path, flags, mode, callback) {

  };
  FileSystem.prototype.close = function close(descriptor, callback) {

  };
  FileSystem.prototype.mkdir = function mkdir(fullpath, callback, optTransaction) {
    fullpath = path.normalize(fullpath);

    var transaction = optTransaction || db.transaction([METADATA_STORE_NAME], IDB_RW);
    this._request(transaction);

    var metaStore = transaction.objectStore(METADATA_STORE_NAME);

    var getRequest = metaStore.get(fullpath);
    getRequest.onsuccess = function(e) {
      var getResult = e.target.result;
      if(getResult) {
        handleError(transaction, new error.EPathExists());
      } else {
        var entry = new DirectoryEntry(fullpath);
        var putRequest = metaStore.put(entry, fullpath);
        putRequest.onsuccess = function(e) {
          runCallback(undefined, callback);
        };
        putRequest.onerror = function(e) {
        };
      }
    };
    getRequest.onerror = function(e) {
    }
  };
  FileSystem.prototype.rmdir = function rmdir(path, callback) {
    fullpath = path.normalize(fullpath);

    var transaction = optTransaction || db.transaction([METADATA_STORE_NAME], IDB_RW);
    this._request(transaction);

    var metaStore = transaction.objectStore(METADATA_STORE_NAME);
    var parentIndex = metaStore.index(PARENT_INDEX);

    var getRequest = metaStore.get(fullpath);
    getRequest.onsuccess = function(e) {
      var getResult = e.target.result;
      if(!getResult) {
        runCallback(callback, new error.ENoEntry());
      } else {
        var contentRequest = parentIndex.get(fullpath);
        contentRequest.onsuccess = function(e) {
          var contentResult = e.target.result;
          if(contentResult) {
            runCallback(callback, new error.ENotEmpty());
          } else {
            var removeRequest = metaStore.delete(fullpath);
            removeRequest.onsuccess = function(e) {
              runCallback(callback);
            };
            removeRequest.onerror = function(e) {

            }
          }
        };
        contentRequest.onerror = function(e) {

        }
      }
    };
    getRequest.onerror = function(e) {

    }
  };
  FileSystem.prototype.stat = function stat(path, callback) {

  };
  FileSystem.prototype.link = function link(oldpath, newpath, callback) {

  };
  FileSystem.prototype.unlink = function unlink(path, callback) {

  };

  function FileSystemContext(fs, optCwd) {
    this._fs = fs;
    this._cwd = optCwd || "/";
  }
  FileSystemContext.prototype.chdir = function chdir(path) {

  };
  FileSystemContext.prototype.getcwd = function getcwd() {
    return this._cwd;
  };
  FileSystemContext.prototype.open = function open(path, flags, mode, callback) {

  };
  FileSystemContext.prototype.close = function close(descriptor, callback) {

  };
  FileSystemContext.prototype.mkdir = function mkdir(path, callback) {

  };
  FileSystemContext.prototype.rmdir = function rmdir(path, callback) {

  };
  FileSystemContext.prototype.stat = function stat(path, callback) {

  };
  FileSystemContext.prototype.link = function link(oldpath, newpath, callback) {

  };
  FileSystemContext.prototype.unlink = function unlink(path, callback) {

  };

  function OpenFile(handle, flags, mode) {
    this._pending = 0;
    this._valid = true;
    this._pointer = 0;
    this._flags = flags;
    this._mode = mode;
  }

  function FileDescriptor(openfile, flags) {
    this._openfile = openfile;
  }
  FileDescriptor.prototype.seek = function seek(offset, whence) {

  };
  FileDescriptor.prototype.read = function read(buffer, callback) {

  };
  FileDescriptor.prototype.write = function write(buffer, callback) {

  };

  var MNT_FORMAT = "FORMAT";
  function mount(name, flags, callback) {
    flags = parseFlags(flags);
    var format = _(flags).contains(MNT_FORMAT);

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
      var files = db.createObjectStore(FILE_STORE_NAME);
      metadata.createIndex(PARENT_INDEX, PARENT_INDEX_KEY_PATH, {unique: false});

      format = true;
    };
    openRequest.onsuccess = function(e) {
      var db = e.target.result;
      var fs = new FileSystem(db);

      if(format) {
        var transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
        var metaStore = transaction.objectStore(METADATA_STORE_NAME);

        var clearRequest = metaStore.clear();
        clearRequest.onsuccess = function() {
          fs.mkdir("/", function(error) {
            if(error) {
              runCallback(callback, error);
            } else {
              runCallback(callback, null, context);
            }
          }, transaction);
        };
        clearRequest.onerror = function(e) {
        };
      }
    };
    openRequest.onerror = function(e) {
    }
  }

  function umount(fs, callback) {
    fs._db.close();
    fs._deferred.then(callback);
  }

  var IDBFS = {
    mount: mount,
    umount: umount
  };

  return IDBFS;

});