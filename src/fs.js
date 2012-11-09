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
  var Path = require("src/path");
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
      callback.apply(undefined, Array.prototype.slice.call(arguments, 1));
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
      parent: Path.dirname(fullpath),
      file: file,
      type: FILE_ENTRY_MIME_TYPE
    }
  }

  var DIRECTORY_ENTRY_MIME_TYPE = "application/directory-entry";
  function DirectoryEntry(fullpath, atime, ctime, mtime, xattrs) {
    var now = Date.now();
    return {
      name: fullpath,
      parent: Path.dirname(fullpath),
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      xattrs: xattrs || {},
      type: DIRECTORY_ENTRY_MIME_TYPE
    }
  }

  function FileSystem(db) {
    this._db = db;    
    this._pending = 0;
    this._mounted = true;
    this._descriptors = {};

    this._deferred = when.defer();
    this._deferred.resolve();

    this.Context = FileSystemContext.bind(undefined, this);
  }
  FileSystem.prototype._request = function _request(transaction) {
    var fs = this;
    if(0 === fs._pending) {
      fs._deferred = when.defer();
    }
    ++ fs._pending;
    transaction.oncomplete = function(e) {
      -- fs._pending;
      if(0 === fs._pending) {
        fs._deferred.resolve();
      }
    }
  };
  var OF_CREATE = "CREATE";
  var OF_APPEND = "APPEND";
  var OF_TRUNCATE = "TRUNCATE";
  var OM_RO = "RO";
  var OM_RW = "RW";
  FileSystem.prototype.open = function open(fullpath, flags, mode, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || fs._db.transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var files = transaction.objectStore(FILE_STORE_NAME);

    flags = parseFlags(flags);
    mode = mode.toUpperCase();

    var getEntryRequest = metadata.get(fullpath);
    getEntryRequest.onsuccess = function(e) {
      var entry = e.target.result;
      var file;
      if(!entry) {
        if(_(flags).contains(OF_CREATE)) {
          file = new File();
          entry = new FileEntry(fullpath, file.handle);
          var createFileRequest = files.put(file, file.handle);
          createFileRequest.onsuccess = function(e) {
            var createEntryRequest = metadata.put(entry, entry.name);
            createEntryRequest.onsuccess = function(e) {              
              _createFileDescriptor(file.handle, flags, mode);
            };
            createEntryRequest.onerror = function(e) {
              runCallback(callback, e);
            };
          };
          createFileRequest.onerror = function(e) {
            runCallback(callback, e);
          };
        }
      } else {
        if(OM_RW === mode && DIRECTORY_ENTRY_MIME_TYPE === entry.type) {
          runCallback(callback, new error.EIsDirectory());
        }
        _createFileDescriptor();
      }
    };
    getEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    };
    function _createFileDescriptor(handle, flags, mode) {
      var openFile = new OpenFile(handle, flags, mode);
      var descriptor = new FileDescriptor(openFile);
      fs._descriptors[descriptor] = openFile;
      runCallback(callback, null, descriptor);
    }
  };
  FileSystem.prototype.close = function close(descriptor, callback) {
    var fs = this;
    var openFile = fs._descriptors[descriptor];
    openFile.valid = false;
    openFile._deferred.then(callback);
  };
  FileSystem.prototype.mkdir = function mkdir(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || fs._db.transaction([METADATA_STORE_NAME], IDB_RW);
    this._request(transaction);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);

    var getEntryRequest = metadata.get(fullpath);
    getEntryRequest.onsuccess = function(e) {      
      var getResult = e.target.result;
      if(getResult) {
        handleError(transaction, new error.EPathExists());
      } else {
        var entry = new DirectoryEntry(fullpath);
        var putRequest = metadata.put(entry, fullpath);
        putRequest.onsuccess = function(e) {          
          runCallback(callback);
        };
        putRequest.onerror = function(e) {
          runCallback(callback, e);
        };
      }
    };
    getEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    }
  };
  FileSystem.prototype.rmdir = function rmdir(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || fs._db.transaction([METADATA_STORE_NAME], IDB_RW);
    this._request(transaction);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var parentIndex = metadata.index(PARENT_INDEX);

    var getRequest = metadata.get(fullpath);
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
            var removeRequest = metadata.delete(fullpath);
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
      runCallback(callback, e);
    }
  };
  FileSystem.prototype.stat = function stat(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || fs._db.transaction([METADATA_STORE_NAME], IDB_RW);
    this._request(transaction);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);

    var getRequest = metadata.get(fullpath);
    getRequest.onsuccess = function(e) {
      var getResult = e.target.result;
      if(!getResult) {
        runCallback(callback, new error.ENoEntry());
      } else {
        runCallback(callback, null, getResult);
      }
    };
    getRequest.onerror = function(e) {
      runCallback(callback, e);
    };
  };
  FileSystem.prototype.link = function link(oldpath, newpath, callback) {

  };
  FileSystem.prototype.unlink = function unlink(fullpath, callback) {

  };
  FileSystem.prototype.setxattr = function setxattr(fullpath, name, value, callback) {

  };
  FileSystem.prototype.getxattr = function getxattr(fullpath, name, callback) {

  };

  function FileSystemContext(fs, optCwd) {
    this._fs = fs;
    this._cwd = optCwd || "/";
  }
  FileSystemContext.prototype.chdir = function chdir(path) {
    if(Path.isAbsolute(path)) {
      this._cwd = Path.normalize(path);
    } else {
      this._cwd = Path.normalize(this._cwd + "/" + path);
    }
  };
  FileSystemContext.prototype.getcwd = function getcwd() {
    return this._cwd;
  };
  FileSystemContext.prototype.open = function open(path, flags, mode, callback) {
    this._fs.open(Path.normalize(this._cwd + "/" + path), flags, mode, callback);
  };
  FileSystemContext.prototype.close = function close(descriptor, callback) {
    this._fs.close(descriptor, callback);
  };
  FileSystemContext.prototype.mkdir = function mkdir(path, callback) {
    this._fs.mkdir(Path.normalize(this._cwd + "/" + path), callback);
  };
  FileSystemContext.prototype.rmdir = function rmdir(path, callback) {
    this._fs.rmdir(Path.normalize(this._cwd + "/" + path), callback);
  };
  FileSystemContext.prototype.stat = function stat(path, callback) {
    this._fs.stat(Path.normalize(this._cwd + "/" + path), callback);
  };
  FileSystemContext.prototype.link = function link(oldpath, newpath, callback) {

  };
  FileSystemContext.prototype.unlink = function unlink(path, callback) {

  };
  FileSystemContext.prototype.setxattr = function setxattr(path, name, value, callback) {

  };
  FileSystemContext.prototype.getxattr = function getxattr(path, name, callback) {

  };

  function OpenFile(handle, flags, mode) {
    this._handle = handle;
    this._pending = 0;
    this._valid = true;
    this._pointer = 0;
    this._flags = flags;
    this._mode = mode;

    this._deferred = when.defer();
    this._deferred.resolve();
  }
  OpenFile.prototype._request = function _request(deferred) {
    var fs = this;
    if(0 === fs._pending) {
      fs._deferred = when.defer();
    }
    ++ fs._pending;
    deferred.then(function() {
      -- fs._pending;
      if(0 === fs._pending) {
        fs._deferred.resolve();
      }
    })
  };

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
      var context = new fs.Context();

      if(format) {
        var transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
        var metadata = transaction.objectStore(METADATA_STORE_NAME);

        var clearRequest = metadata.clear();
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
          console.log(e);
        };
      } else {
        runCallback(callback, null, context)
      }
    };
    openRequest.onerror = function(e) {
      console.log(e);
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