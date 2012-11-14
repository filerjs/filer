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
  require("crypto-js/rollups/sha256"); var Crypto = CryptoJS;

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

  function Data(bytes) {
    return {
      bytes: bytes || undefined
    }
  }

  function File(size, atime, ctime, mtime, nlinks, type, flags, data, xattrs, links) {
    var now = Date.now();
    return {
      size: size || 0,
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      type: type || "application/octet-stream",
      flags: flags || "",      
      xattrs: xattrs || {},
      data: data || Crypto.SHA256(guid()).toString(Crypto.enc.hex),
      links: links || 0
    }
  }

  var FILE_ENTRY_MIME_TYPE = "application/file-entry";
  function FileEntry(fullpath, file, version) {
    return {
      name: fullpath,
      parent: Path.dirname(fullpath),
      file: file || Crypto.SHA256(guid()).toString(Crypto.enc.hex),
      type: FILE_ENTRY_MIME_TYPE,
      version: version || 0
    }
  }

  var DIRECTORY_ENTRY_MIME_TYPE = "application/directory-entry";
  function DirectoryEntry(fullpath, atime, ctime, mtime, xattrs, version) {
    var now = Date.now();
    return {
      name: fullpath,
      parent: Path.dirname(fullpath),
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      xattrs: xattrs || {},
      type: DIRECTORY_ENTRY_MIME_TYPE,
      version: version || 0
    }
  }

  function Stats(size, handle, atime, ctime, mtime, links) {
    return {
      size: size,
      handle: handle,
      atime: atime,
      ctime: ctime,
      mtime: mtime,
      links: links
    }
  }

  function Transaction(db, request, stores, mode) {
    var transaction = db.transaction(stores, mode);
    var deferred = when.defer();
    transaction.oncomplete = deferred.resolve;
    transaction.then = deferred.then;
    request(transaction);
    return transaction;
  }

  function FileSystem(db) {
    this._db = db;    
    this._pending = 0;
    this._mounted = true;
    this._descriptors = {};

    this._deferred = when.defer();
    this._deferred.resolve();

    this.Context = FileSystemContext.bind(undefined, this);
    this.Transaction = Transaction.bind(undefined, db, this._request);
  }
  FileSystem.prototype._request = function _request(transaction) {
    var fs = this;
    if(0 === fs._pending) {
      fs._deferred = when.defer();
    }
    ++ fs._pending;
    transaction.then(function(e) {
      -- fs._pending;
      if(0 === fs._pending) {
        fs._deferred.resolve();
      }
    });
  };
  var OF_CREATE = "CREATE";
  var OF_APPEND = "APPEND";
  var OF_TRUNCATE = "TRUNCATE";
  var OM_RO = "RO";
  var OM_RW = "RW";
  FileSystem.prototype.open = function open(fullpath, flags, mode, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);

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
          entry = new FileEntry(fullpath);
          file = new File();
          ++ file.links;
          var createFileRequest = files.put(file, entry.file);
          createFileRequest.onsuccess = function(e) {
            var createEntryRequest = metadata.put(entry, entry.name);
            createEntryRequest.onsuccess = function(e) {
              _createFileDescriptor(entry, flags, mode);
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
        _createFileDescriptor(entry, flags, mode);
      }
    };
    getEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    };
    function _createFileDescriptor(entry, flags, mode) {
      var openfile = new OpenFile(fs, entry, flags, mode);
      var descriptor = new FileDescriptor(openfile);
      fs._descriptors[descriptor] = openfile;
      runCallback(callback, null, descriptor);
    }
  };
  FileSystem.prototype.close = function close(descriptor, callback) {
    var fs = this;
    var openfile = fs._descriptors[descriptor];
    openfile.valid = false;
    openfile._deferred.then(callback);
  };
  FileSystem.prototype.mkdir = function mkdir(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([METADATA_STORE_NAME], IDB_RW);

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

    var transaction = optTransaction || new fs.Transaction([METADATA_STORE_NAME], IDB_RW);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var parentIndex = metadata.index(PARENT_INDEX);

    var getEntryRequest = metadata.get(fullpath);
    getEntryRequest.onsuccess = function(e) {
      var entry = e.target.result;
      if(!entry) {
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
              runCallback(callback, e);
            }
          }
        };
        contentRequest.onerror = function(e) {
          runCallback(callback, e);
        }
      }
    };
    getEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    }
  };
  FileSystem.prototype.stat = function stat(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RO);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var files = transaction.objectStore(FILE_STORE_NAME);

    var getEntryRequest = metadata.get(fullpath);
    getEntryRequest.onsuccess = function(e) {
      var entry = e.target.result;
      var stats;
      if(!entry) {
        runCallback(callback, new error.ENoEntry());
      } else {
        if(DIRECTORY_ENTRY_MIME_TYPE === entry.type) {
          stats = new Stats(undefined, undefined, entry.atime, entry.ctime, entry.mtime, undefined);
          runCallback(callback, null, stats);
        } else if(FILE_ENTRY_MIME_TYPE === entry.type) {
          var getFileRequest = files.get(entry.file);
          getFileRequest.onsuccess = function(e) {
            var file = e.target.result;
            stats = new Stats(file.size, entry.file, file.atime, file.ctime, file.mtime, file.links);
            runCallback(callback, null, stats);
          };
          getFileRequest.onerror = function(e) {
            runCallback(callback, e);
          };
        }
      }
    };
    getEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    };
  };
  FileSystem.prototype.link = function link(oldpath, newpath, callback, optTransaction) {
    var fs = this;
    oldpath = Path.normalize(oldpath);
    newpath = Path.normalize(newpath);

    var transaction = optTransaction || new fs.Transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var files = transaction.objectStore(FILE_STORE_NAME);

    var getOldEntryRequest = metadata.get(oldpath);
    getOldEntryRequest.onsuccess = function(e) {
      var oldentry = e.target.result;
      if(!oldentry) {
        runCallback(callback, new error.ENoEntry());
      } else {
        var getNewEntryRequest = metadata.get(newpath);
        getNewEntryRequest.onsuccess = function(e) {
          var newentry = e.target.result;
          if(newentry) {
            runCallback(callback, new error.EPathExists());
          } else {
            newentry = new FileEntry(newpath, oldentry.file);
            var putNewEntryRequest = metadata.put(newentry, newentry.name);
            putNewEntryRequest.onsuccess = function(e) {
              var getFileRequest = files.get(newentry.file);
              getFileRequest.onsuccess = function(e) {
                var file = e.target.result;
                ++ file.links;
                var putFileRequest = files.put(file, newentry.file);
                putFileRequest.onsuccess = function(e) {
                  runCallback(callback);
                };
                putFileRequest.onerror = function(e) {
                  runCallback(callback, e);
                };
              };
              getFileRequest.onerror = function(e) {
                runCallback(callback, e);
              };
            };
            putNewEntryRequest.onerror = function(e) {
              runCallback(callback, e);
            };
          }
        };
        getNewEntryRequest.onerror = function(e) {
          runCallback(callback, e);
        };
      }
    };
    getOldEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    }
  };
  FileSystem.prototype.unlink = function unlink(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var files = transaction.objectStore(FILE_STORE_NAME);

    var getEntryRequest = metadata.get(fullpath);
    getEntryRequest.onsuccess = function(e) {
      var entry = e.target.result;
      if(!entry) {
        runCallback(callback, new error.ENoEntry());
      } else if(DIRECTORY_ENTRY_MIME_TYPE === entry.type) {
        runCallback(callback, new error.EIsDirectory());
      } else {
        var deleteEntryRequest = metadata.delete(entry.name);
        deleteEntryRequest.onsuccess = function(e) {
          var getFileRequest = files.get(entry.file);
          getFileRequest.onsuccess = function(e) {
            var file = e.target.result;
            -- file.links;
            if(0 === files.links) {
              var deleteFileRequest = files.delete(entry.file);
              deleteFileRequest.onsuccess = complete;
              deleteFileRequest.onerror = function(e) {
                runCallback(callback, e);
              };
            } else {
              var putFileRequest = files.put(file, entry.file);
              putFileRequest.onsuccess = complete;
              putFileRequest.onerror = function(e) {
                runCallback(callback, e);
              };
            }
            function complete() {
              runCallback(callback);
            }
          };
          getFileRequest.onerror = function(e) {
            runCallback(callback, e);
          };
        };
        deleteEntryRequest.onerror = function(e) {
          runCallback(callback, e);
        };        
      }
    };
    getEntryRequest.onerror = function(e) {
      runCallback(callback, e);
    };
  };
  FileSystem.prototype.setxattr = function setxattr(fullpath, name, value, callback, optTransaction) {

  };
  FileSystem.prototype.getxattr = function getxattr(fullpath, name, callback, optTransaction) {

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
    this._fs.link(Path.normalize(this._cwd + "/" + oldpath), Path.normalize(this._cwd + "/" + newpath), callback);
  };
  FileSystemContext.prototype.unlink = function unlink(path, callback) {
    this._fs.unlink(Path.normalize(this._cwd + "/" + path), callback);
  };
  FileSystemContext.prototype.setxattr = function setxattr(path, name, value, callback) {

  };
  FileSystemContext.prototype.getxattr = function getxattr(path, name, callback) {

  };

  function OpenFile(fs, entry, flags, mode, size) {
    this._fs = fs;
    this._pending = 0;
    this._valid = true;
    this._position = 0;
    this._flags = flags;
    this._mode = mode;
    this._size = size;

    this._entry = entry;  // Cached entry, might require an update

    this._deferred = when.defer();
    this._deferred.resolve();

    var openfile = this;
    this.Transaction = Transaction.bind(undefined, fs._db, function(transaction) {
      fs._request(transaction);
      openfile._request(transaction);
    });
  }
  OpenFile.prototype._request = function _request(transaction) {
    var openfile = this;
    if(0 === openfile._pending) {
      openfile._deferred = when.defer();
    }
    ++ openfile._pending;
    transaction.then(function(x) {
      -- openfile._pending;
      if(0 === openfile._pending) {
        openfile._deferred.resolve();
      }
    });
  };
  OpenFile.prototype.seek = function seek(offset, origin, callback, optTransaction) {
    var openfile = this;
    var fs = openfile._fs;
    origin = origin.toUpperCase();

    var transaction = optTransaction || new openfile.Transaction([FILE_STORE_NAME], IDB_RO);

    var files = transaction.objectStore(FILE_STORE_NAME);

    if(SK_END === origin) {
      var getFileRequest = files.get(fd._handle);
      getFileRequest.onsuccess = function(e) {
        var file = e.target.result;
        var size = file.size;
        offset += size;
        openfile._position = offset;
        runCallback(callback, null, offset);
      };
      getFileRequest.onerror = function(e) {
        runCallback(callback, e);
      };
    } else if(SK_CURRENT === origin) {
      openfile._position += offset;
      runCallback(callback, null, openfile._position);
    } else if(SK_SET === origin) {
      openfile._position = offset;
      runCallback(callback, null, offset);
    }
  };
  OpenFile.prototype.read = function read(buffer, callback, optTransaction) {
    var openfile = this;
    var fs = openfile._fs;
    var transaction = optTransaction || new openfile.Transaction([FILE_STORE_NAME], IDB_RO);

    var files = transaction.objectStore(FILE_STORE_NAME);

    if(FILE_ENTRY_MIME_TYPE === openfile._entry.type) {
      var getDataRequest = files.get(Crypto.SHA256(openfile._handle).toString(Crypto.enc.hex));
      getDataRequest.onsuccess = function(e) {        
        var data = e.target.result;
        if(!data) {
          // There's not file data, so return zero bytes read
          runCallback(callback, null, 0, buffer);
        } else {
          // Make sure we won't read past the end of the file
          var bytes = (openfile._position + buffer.length > data.length) ? data.length - openfile._position : buffer.length;
          // Copy the desired region from the file into the buffer
          var dataView = data.subarray(openfile._position, openfile._position + bytes);
          buffer.set(dataView);
          openfile._position += bytes;
          runCallback(callback, null, bytes, buffer);
        }
      };
      getDataRequest.onerror = function(e) {
        runCallback(callback, e);
      }
    } else if(DIRECTORY_ENTRY_MIME_TYPE === openfile._type) {
      runCallback(callback, new error.ENotImplemented());
    }
  };
  OpenFile.prototype.write = function write(buffer, callback, optTransaction) {
    var openfile = this;
    var fs = openfile._fs;

    if(OM_RO === openfile._mode) {
      runCallback(callback, new error.EBadFileDescriptor());
      return;
    }

    var transaction = optTransaction || openfile.Transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);

    var metadata = transaction.objectStore(METADATA_STORE_NAME);
    var files = transaction.objectStore(FILE_STORE_NAME);

    var handle = Crypto.SHA256(openfile._handle).toString(Crypto.enc.hex);
    var getDataRequest = files.get(handle);
    getDataRequest.onsuccess = function(e) {
      var data = e.target.result;
      var bytes = buffer.length;
      var dataLength = data ? data.length : 0;
      var size = (dataLength > openfile._position + bytes) ? dataLength : openfile._position + bytes;
      var newData = new Uint8Array(size);
      if(data) {
        newData.set(data);
      }
      newData.set(buffer, openfile._position);
      openfile._position += bytes;
      var putDataRequest = files.put(newData, handle);
      putDataRequest.onsuccess = function(e) {
        var getFileRequest = files.get(openfile._entry.file);
        getFileRequest.onsuccess = function(e) {
          var file = e.target.result;
          file.size = size;
          file.mtime = Date.now();
          var putFileRequest = files.put(file, openfile._entry.file);
          putFileRequest.onsuccess = function(e) {
            runCallback(callback, null, size);
          };
          putFileRequest.onerror = function(e) {
            runCallback(callback, e);
          };
        };
        getFileRequest.onerror = function(e) {
          runCallback(callback, e);
        };
      };
      putDataRequest.onerror = function(e) {
        runCallback(callback, e);
      };
    };
    getDataRequest.onerror = function(e) {
      runCallback(callback, e);
    };
  };

  function FileDescriptor(openfile, flags) {
    this._openfile = openfile;
    this._flags = flags;
  }
  var SK_SET = "SET";
  var SK_CURRENT = "CURRENT";
  var SK_END = "END";
  FileDescriptor.prototype.seek = function seek(offset, origin, callback) {
    this._openfile.seek(offset, origin, callback);
  };
  FileDescriptor.prototype.read = function read(buffer, callback) {
    this._openfile.read(buffer, callback);
  };
  FileDescriptor.prototype.write = function write(buffer, callback) {
    this._openfile.write(buffer, callback);
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