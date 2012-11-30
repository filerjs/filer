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
  var error = require("src/error");
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

  function runcallback(callback) {
    if("function" === typeof callback) {
      callback.apply(undefined, Array.prototype.slice.call(arguments, 1));
    }
  }

  function hash(string) {
    return Crypto.SHA256(string).toString(Crypto.enc.hex);
  }

  function Data(bytes) {
    return {
      bytes: bytes || undefined
    }
  }

  var FILE_MIME_TYPE = "application/file";
  var DIRECTORY_MIME_TYPE = "application/directory";

  var BINARY_MIME_TYPE = "application/octet-stream";
  var JSON_MIME_TYPE = "application/json";

  var DEFAULT_DATA_TYPE = BINARY_MIME_TYPE;
  function File(mode, data, type, size, version, atime, ctime, mtime, flags, xattrs, links) {
    var now = Date.now();
    return {
      size: size || 0,
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      mode: mode || FILE_MIME_TYPE,
      flags: flags || "",      
      xattrs: xattrs || {},
      data: data || Crypto.SHA256(guid()).toString(Crypto.enc.hex),
      type: type || DEFAULT_DATA_TYPE,
      links: links || 0,
      version: version || 0,
      id: Crypto.SHA256(guid()).toString(Crypto.enc.hex)
    }
  }

  function signature(file) {
    // Compute file signature based on file id and version
  }

  function Stats(size, data, atime, ctime, mtime, links) {
    return {
      size: size,
      data: data,
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

    var transaction = optTransaction || new fs.Transaction([FILE_STORE_NAME], IDB_RW);

    var files = transaction.objectStore(FILE_STORE_NAME);

    flags = parseFlags(flags);
    mode = mode.toUpperCase();

    var name = Path.basename(fullpath);
    var parentpath = Path.dirname(fullpath);
    var parenthandle = hash(parentpath);
    var getParentRequest = files.get(parenthandle);
    getParentRequest.onsuccess = function(e) {
      var parent = e.target.result;
      var data = parent.data;
      var file, filehandle;
      if(!_(data).has(name)) {
        if(_(flags).contains(OF_CREATE)) {
          filehandle = data[name] = hash(guid());
          file = new File();
          ++ file.links;
          var createFileRequest = files.put(file, data[name]);
          createFileRequest.onsuccess = function(e) {
            var updateParentRequest = files.put(parent, parenthandle);
            updateParentRequest.onsuccess = function(e) {
              _createFileDescriptor(filehandle, file, flags, mode);
            };
            updateParentRequest.onerror = function(e) {
              runcallback(callback, e);
            };
          };
          createFileRequest.onerror = function(e) {
            runcallback(callback, e);
          };
        }
      } else {
        filehandle = data[name];
        var getFileRequest = files.get(filehandle);
        getFileRequest.onsuccess = function(e) {
          file = e.target.result;
          if(OM_RW === mode && DIRECTORY_MIME_TYPE === file.mode) {
            runcallback(callback, new error.EIsDirectory());
          }
          _createFileDescriptor(filehandle, file, flags, mode);
        };
        getFileRequest.onerror = function(e) {
          runcallback(callback, e);
        };
      }
    };
    getParentRequest.onerror = function(e) {
      runcallback(callback, e);
    };

    function _createFileDescriptor(handle, file, flags, mode) {
      var openfile = new OpenFile(fs, handle, file, flags, mode);
      var descriptor = new FileDescriptor(openfile);
      fs._descriptors[descriptor] = openfile;
      runcallback(callback, null, descriptor);
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

    var transaction = optTransaction || new fs.Transaction([FILE_STORE_NAME], IDB_RW);

    var files = transaction.objectStore(FILE_STORE_NAME);

    var directoryhandle = hash(fullpath);
    var parentpath = Path.dirname(fullpath);
    var parenthandle = hash(parentpath);
    var getDirectoryRequest = files.get(directoryhandle);
    getDirectoryRequest.onsuccess = function(e) {
      var directory = e.target.result;
      if(directory) {
        runcallback(callback, new error.EPathExists());
      } else {
        directory = new File(DIRECTORY_MIME_TYPE, {
          ".": directoryhandle,
          "..": parenthandle,
          }, JSON_MIME_TYPE, 2);
        ++ directory.links;
        var createDirectoryRequest = files.put(directory, directoryhandle);
        createDirectoryRequest.onsuccess = function(e) {          
          var getParentRequest = files.get(parenthandle);
          getParentRequest.onsuccess = function(e) {
            var parent = e.target.result;
            parent.data[Path.basename(fullpath)] = directoryhandle;
            ++ parent.version;
            var updateParentRequest = files.put(parent, parenthandle);
            updateParentRequest.onsuccess = function(e) {
              runcallback(callback);
            };
            updateParentRequest.onerror = function(e) {
              runcallback(callback, e);
            };
          };
          getParentRequest.onerror = function(e) {
            runcallback(callback, e);
          };
        };
        createDirectoryRequest.onerror = function(e) {
          runcallback(callback, e);
        };
      }
    };
    getDirectoryRequest.onerror = function(e) {
      runcallback(callback, e);
    };
  };
  FileSystem.prototype.rmdir = function rmdir(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([FILE_STORE_NAME], IDB_RW);

    var files = transaction.objectStore(FILE_STORE_NAME);

    var directoryhandle = hash(fullpath);
    var getDirectoryRequest = files.get(directoryhandle);
    getDirectoryRequest.onsuccess = function(e) {
      var directory = e.target.result;
      if(!directory) {
        runcallback(callback, new error.ENoEntry());
      } else {
        var data = directory.data;
        if(Object.keys(data).length > 2) {
          runcallback(callback, new error.ENotEmpty());
        } else {
          var removeDirectoryRequest = files.delete(directoryhandle);
          removeDirectoryRequest.onsuccess = function(e) {
            var parentpath = Path.dirname(fullpath);
            var parenthandle = hash(parentpath);
            var getParentRequest = files.get(parenthandle);
            getParentRequest.onsuccess = function(e) {
              var parent = e.target.result;
              delete parent.data[directoryhandle];
              ++ parent.version;
              var updateParentRequest = files.put(parent, parenthandle);
              updateParentRequest.onsuccess = function(e) {
                runcallback(callback);
              };
              updateParentRequest.onerror = function(e) {
                runcallback(callback, e);
              };
            };
            getParentRequest.onerror = function(e) {
              runcallback(callback, e);
            };
          };
          removeDirectoryRequest.onerror = function(e) {
            runcallback(callback, e);
          };
        }
      }
    };
    getDirectoryRequest.onerror = function(e) {
      runcallback(callback, e);
    };
  };
  FileSystem.prototype.stat = function stat(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([FILE_STORE_NAME], IDB_RO);

    var files = transaction.objectStore(FILE_STORE_NAME);

    var parentpath = Path.dirname(fullpath);
    var parenthandle = hash(parentpath);
    var getParentRequest = files.get(parenthandle);    
    getParentRequest.onsuccess = function(e) {
      var parent = e.target.result;
      var data = parent.data;
      var name = Path.basename(fullpath);
      if(!_(data).has(name)) {
        runcallback(callback, new error.ENoEntry());
      } else {
        var filehandle = data[name];
        var getFileRequest = files.get(filehandle);
        getFileRequest.onsuccess = function(e) {
          var file = e.target.result;
          var stats = new Stats(file.size, file.data, file.atime, file.ctime, file.mtime, file.links);
          runcallback(callback, null, stats);
        };
        getFileRequest.onerror = function(e) {
          runcallback(callback, e);
        };
      }
    };
    getParentRequest.onerror = function(e) {
      runcallback(callback, e);
    };    
  };
  FileSystem.prototype.link = function link(oldpath, newpath, callback, optTransaction) {
    var fs = this;
    oldpath = Path.normalize(oldpath);
    newpath = Path.normalize(newpath);
    var oldparentpath = Path.dirname(oldpath);
    var newparentpath = Path.dirname(newpath);

    var transaction = optTransaction || new fs.Transaction([FILE_STORE_NAME], IDB_RW);

    var files = transaction.objectStore(FILE_STORE_NAME);

    var oldparenthandle = hash(oldparentpath);
    var newparenthandle = hash(newparentpath);
    var getOldParentRequest = files.get(oldparenthandle);
    getOldParentRequest.onsuccess = function(e) {
      var oldparent = e.target.result;
      if(!oldparent) {
        runcallback(callback, new error.ENoEntry());
      } else {
        var olddata = oldparent.data;
        var filehandle = olddata[Path.basename(oldpath)];
        if(!filehandle) {
          runcallback(callback, new error.ENoEntry());
        } else {
          var getNewParentRequest = files.get(newparenthandle);
          getNewParentRequest.onsuccess = function(e) {
            var newparent = e.target.result;
            if(!newparent) {
              runcallback(callback, new error.ENoEntry());
            } else {              
              var getFileRequest = files.get(filehandle);
              getFileRequest.onsuccess = function(e) {
                var file = e.target.result;
                ++ file.links;
                ++ file.version;
                var updateFileRequest = files.put(file, filehandle);
                updateFileRequest.onsuccess = function(e) {
                  var newdata = newparent.data;
                  var newname = Path.basename(newpath);
                  if(_(newdata).has(newname)) {
                    runcallback(callback, new error.EPathExists());
                  } else {
                    newdata[newname] = filehandle;
                    ++ parent.version;                
                    var updateNewParentRequest = files.put(newparent, newparenthandle);
                    updateNewParentRequest.onsuccess = function(e) {
                      runcallback(callback);
                    };
                    updateNewParentRequest.onerror = function(e) {
                      runcallback(callback, e);
                    };
                  }
                };
                updateFileRequest.onerror = function(e) {
                  runcallback(callback, e);
                };
              };
              getFileRequest.onerror = function(e) {
                runcallback(callback, e);
              };              
            }
          };
          getNewParentRequest.onerror = function(e) {
            runcallback(callback, e);
          };
        }
      }
    };
    getOldParentRequest.onerror = function(e) {
      runcallback(callback, e);
    };
  };
  FileSystem.prototype.unlink = function unlink(fullpath, callback, optTransaction) {
    var fs = this;
    fullpath = Path.normalize(fullpath);

    var transaction = optTransaction || new fs.Transaction([FILE_STORE_NAME], IDB_RW);

    var files = transaction.objectStore(FILE_STORE_NAME);
  
    var parentpath = Path.dirname(fullpath);
    var parenthandle = hash(parentpath);
    var getParentRequest = files.get(parenthandle);
    getParentRequest.onsuccess = function(e) {
      var parent = e.target.result;
      var data = parent.data;
      var name = Path.basename(fullpath);
      if(!_(data).has(name)) {
        runcallback(callback, new error.ENoEntry());
      } else {
        var filehandle = data[name];
        delete data[name];
        var updateParentRequest = files.put(parent, parenthandle);
        updateParentRequest.onsuccess = function(e) {
          var getFileRequest = files.get(filehandle);
          getFileRequest.onsuccess = function(e) {
            var file = e.target.result;
            -- file.links;            
            if(0 === file.links) {
              var deleteFileRequest = files.delete(filehandle);
              deleteFileRequest.onsuccess = complete;
              deleteFileRequest.onerror = function(e) {
                runcallback(callback, e);
              };
            } else {
              ++ file.version;
              var putFileRequest = files.put(file, filehandle);
              putFileRequest.onsuccess = complete;
              putFileRequest.onerror = function(e) {
                runcallback(callback, e);
              };
            }
            function complete() {
              runcallback(callback);
            }
          };
          getFileRequest.onerror = function(e) {
            runcallback(callback, e);
          };
        };
        updateParentRequest.onerror = function(e) {
          runcallback(callback, e);
        };
      }
    };
    getParentRequest.onerror = function(e) {
      runcallback(callback, e);
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
    this._fs.setxattr(Path.normalize(this._cwd + "/" + path), name, value, callback);
  };
  FileSystemContext.prototype.getxattr = function getxattr(path, name, callback) {
    this._fs.getxattr(Path.normalize(this._cwd + "/" + path), name, callback);
  };

  function OpenFile(fs, handle, file, flags, mode, size) {    
    this._fs = fs;
    this._pending = 0;
    this._valid = true;
    this._position = 0;
    this._flags = flags;
    this._mode = mode;
    this._size = size;

    this._handle = handle;
    this._file = file;  // Cached file node, might require an update

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
        runcallback(callback, null, offset);
      };
      getFileRequest.onerror = function(e) {
        runcallback(callback, e);
      };
    } else if(SK_CURRENT === origin) {
      openfile._position += offset;
      runcallback(callback, null, openfile._position);
    } else if(SK_SET === origin) {
      openfile._position = offset;
      runcallback(callback, null, offset);
    }
  };
  OpenFile.prototype.read = function read(buffer, callback, optTransaction) {
    var openfile = this;
    var fs = openfile._fs;
    var transaction = optTransaction || new openfile.Transaction([FILE_STORE_NAME], IDB_RO);

    var files = transaction.objectStore(FILE_STORE_NAME);

    if(FILE_MIME_TYPE === openfile._file.mode) {
      var getDataRequest = files.get(openfile._file.data);
      getDataRequest.onsuccess = function(e) {        
        var data = e.target.result;
        if(!data) {
          // There's not file data, so return zero bytes read
          runcallback(callback, null, 0, buffer);
        } else {
          // Make sure we won't read past the end of the file
          var bytes = (openfile._position + buffer.length > data.length) ? data.length - openfile._position : buffer.length;
          // Copy the desired region from the file into the buffer
          var dataView = data.subarray(openfile._position, openfile._position + bytes);
          buffer.set(dataView);
          openfile._position += bytes;
          runcallback(callback, null, bytes, buffer);
        }
      };
      getDataRequest.onerror = function(e) {
        runcallback(callback, e);
      }
    } else if(DIRECTORY_MIME_TYPE === openfile._file.mode) {
      runcallback(callback, new error.ENotImplemented());
    }
  };
  OpenFile.prototype.write = function write(buffer, callback, optTransaction) {
    var openfile = this;
    var fs = openfile._fs;

    if(OM_RO === openfile._mode) {
      runcallback(callback, new error.EBadFileDescriptor());
      return;
    }

    var transaction = optTransaction || openfile.Transaction([FILE_STORE_NAME], IDB_RW);

    var files = transaction.objectStore(FILE_STORE_NAME);

    var getDataRequest = files.get(openfile._file.data);
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
      var putDataRequest = files.put(newData, openfile._file.data);
      putDataRequest.onsuccess = function(e) {
        var getFileRequest = files.get(openfile._handle);
        getFileRequest.onsuccess = function(e) {
          var file = e.target.result;
          file.size = size;
          file.mtime = Date.now();
          var putFileRequest = files.put(file, openfile._handle);
          putFileRequest.onsuccess = function(e) {
            runcallback(callback, null, size);
          };
          putFileRequest.onerror = function(e) {
            runcallback(callback, e);
          };
        };
        getFileRequest.onerror = function(e) {
          runcallback(callback, e);
        };
      };
      putDataRequest.onerror = function(e) {
        runcallback(callback, e);
      };
    };
    getDataRequest.onerror = function(e) {
      runcallback(callback, e);
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

      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      var files = db.createObjectStore(FILE_STORE_NAME);

      format = true;
    };
    openRequest.onsuccess = function(e) {
      var db = e.target.result;
      var fs = new FileSystem(db);
      var context = new fs.Context();

      if(format) {
        var transaction = db.transaction([FILE_STORE_NAME], IDB_RW);

        var files = transaction.objectStore(FILE_STORE_NAME);

        var clearRequest = files.clear();
        clearRequest.onsuccess = function() {
          fs.mkdir("/", function(error) {
            if(error) {
              runcallback(callback, error);
            } else {
              runcallback(callback, null, context);
            }
          }, transaction);
        };
        clearRequest.onerror = function(e) {
          console.log(e);
        };
      } else {
        runcallback(callback, null, context)
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