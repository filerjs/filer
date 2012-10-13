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
      "contenttype": "application/directory",
      "lastmodified": modtime || Date.now()
    }
  }

  function makeFileEntry(name, oid, size, modtime) {
    var parent = path.dirname(name);
    return {
      "parent": parent,
      "name": name,
      "contenttype": "application/file",
      "lastmodified": modtime || Date.now(),
      "size": size || 0,
      "oid": oid || guid()
    }
  }

  var METADATA_STORE_NAME = "metadata";
  var FILE_STORE_NAME = "files";  
  var NAME_INDEX = "name";
  var NAME_INDEX_KEY_PATH = "name";
  var PARENT_INDEX = "parent";
  var PARENT_INDEX_KEY_PATH = "parent";
  var OBJECT_ID_INDEX = "oid";
  var OBJECT_ID_INDEX_KEY_PATH = "oid";
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
  var T_CLOSE = 0x5;
  var T_READ = 0x6;
  var T_UNLINK = 0x7;
  // Codes
  var E_EXIST = 0x0;
  var E_ISDIR = 0x1;
  var E_NOENT = 0x2;
  var E_BUSY = 0x3;
  var E_NOTEMPTY = 0x4;
  var E_NOTDIR = 0x5;
  var E_BADF = 0x6;
  var E_NOT_IMPLEMENTED = 0x7;

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
    var fds = {}; // Open file descriptors

    // Internal prototypes

    function OpenFileDescription(name, entry, flags, mode) {
      this.name = name;      
      this.entry = entry;
      this.flags = flags;
      this.mode = mode;
      this.pointer = 0;
      this.pending = 0;
      this.valid = true;
      this.oncomplete = undefined;
    }

    function FileDescriptor(ofd) {
      var descriptor = this.descriptor = guid();

      function start() {
        if(!ofd.valid) {
          return false;
        }
        ++ ofd.pending;
        return true;
      }

      function end() {
        -- ofd.pending;
        if(!ofd.valid && !ofd.pending) {
          if(ofd.oncomplete && "function" === typeof ofd.oncomplete) {
            debug.info("close <--");
            ofd.oncomplete.call();
          }
        }
      }

      function read(buffer, callback) {
        debug.info("read -->");
        var onerror = genericIDBErrorHandler("read", callback);
        if(!start()) {
          onerror(new IDBFSError(T_READ, E_BADF));
          return;
        }
        transaction = db.transaction([FILE_STORE_NAME], IDB_RO);
        transaction.oncomplete = function(e) {
          end();
        }
        var store = transaction.objectStore(FILE_STORE_NAME);        

        if(MIME_FILE === ofd.entry["contenttype"]) {
          var oid = ofd.entry["oid"];
          var getRequest = store.get(oid);
          getRequest.onsuccess = function(e) {
            var storedBuffer = e.target.result;
            if(!storedBuffer) {
              // There's no file data, so return zero bytes read
              end();
              debug.info("read <--");
              if(callback && "function" === typeof callback) {
                callback.call(undefined, undefined, 0, buffer);
              }
            } else {
              // Make sure we're not going to read past the end of the file
              var bytes = (ofd.pointer + buffer.length > storedBuffer.length) ? (storedBuffer.length - ofd.pointer) : buffer.length;
              // Copy the desired region from the file into the buffer supplied
              var storedBufferView = storedBuffer.subarray(ofd.pointer, ofd.pointer + bytes);
              buffer.set(storedBufferView);
              ofd.pointer += bytes;
              debug.info("read <--");
              if(callback && "function" === typeof callback) {
                callback.call(undefined, undefined, bytes, buffer);
              }
            }
          };
          getRequest.onerror = onerror;
        } else if(MIME_DIRECTORY === ofd.entry["contenttype"]) {
          // NOT IMPLEMENTED
          onerror(new IDBFSError(T_READ, E_NOT_IMPLEMENTED))
        }
      }

      function write(buffer, callback) {
        debug.info("write -->");
        var onerror = genericIDBErrorHandler("write", callback);        
        if(OM_RO === ofd.mode) {
          onerror(new IDBFSError(T_READ, E_BADF));
          return;
        }
        if(!start()) {
          onerror(new IDBFSError(T_READ, E_BADF));
          return;
        }
        transaction = db.transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);
        transaction.oncomplete = function(e) {
          end();
        }
        var metaStore = transaction.objectStore(METADATA_STORE_NAME);
        var fileStore = transaction.objectStore(FILE_STORE_NAME);
        var oid = ofd.entry["oid"];
        var getRequest = fileStore.get(oid);
        getRequest.onsuccess = function(e) {
          var storedBuffer = e.target.result;
          if(!storedBuffer) {
            storedBuffer = new Uint8Array();
          }
          var bytes = buffer.length;
          var size = (storedBuffer.length > ofd.pointer + bytes) ? storedBuffer.length : ofd.pointer + bytes;
          var writeBuffer = new Uint8Array(size);
          writeBuffer.set(storedBuffer);
          writeBuffer.set(buffer);
          ofd.pointer += bytes;
          var putRequest = fileStore.put(writeBuffer, oid);            
          putRequest.onsuccess = function(e) {              
            var readMetadataRequest = metaStore.get(ofd.entry["name"]);
            readMetadataRequest.onsuccess = function(e) {
              var entry = e.target.result;
              entry = makeFileEntry(entry["name"], entry["oid"], size);
              ofd.entry = entry;                
              var writeMetadataRequest = metaStore.put(entry, entry["name"]);
              writeMetadataRequest.onsuccess = function(e) {
                debug.info("write <--");
                if(callback && "function" === typeof callback) {              
                  callback.call(undefined, undefined, size, buffer);
                }                
              };
              writeMetadataRequest.onerror = onerror;
            }              
            readMetadataRequest.onerror = onerror;              
          };
          putRequest.onerror = onerror;
        };
        getRequest.onerror = onerror;
      }

      var SW_SET = "SET";
      var SW_CURRENT = "CURRENT";
      var SW_END = "END";
      function seek(offset, whence) {
        whence = whence || SW_CURRENT;
        if(SW_SET === whence) {
          ofd.pointer = offset;
        } else if(SW_CURRENT === whence) {
          ofd.pointer += offset;
        } else if(SW_END === whence) {
          ofd.pointer = ofd.entry["size"] + offset;
        }
      }

      this.read = read;
      this.seek = seek;
      this.write = write;
      Object.defineProperty(this, "valid", {
        get: function() {
          return ofd.valid;
        }
      });

      fds[descriptor] = ofd;
    }

    // API

    // Flags
    var OF_CREATE = "CREATE";
    var OF_APPEND = "APPEND";
    var OF_TRUNCATE = "TRUNCATE";
    var OF_DIRECTORY = "DIRECTORY";
    // Modes
    var OM_RO = "RO";
    var OM_RW = "RW";
    function open(pathname, flags, mode, callback) {
      debug.info("open -->");      
      pathname = path.normalize(pathname);
      transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);
      var onerror = genericIDBErrorHandler("mkdir", callback);

      if(undefined === flags) {
        flags = [];
      } else if("string" === typeof flags) {
        flags = [flags];
      }

      var getRequest = nameIndex.get(pathname);
      getRequest.onsuccess = function(e) {
        var entry = e.target.result;
        if(!entry) {
          if(!_(flags).contains(OF_CREATE)) {
            onerror(new IDBFSError(T_OPEN, E_NOENT));
            return;
          } else {
            entry = makeFileEntry(pathname);
            var createRequest = store.put(entry, pathname);
            createRequest.onsuccess = complete;
            createRequest.onerror = onerror;
          }
        } else {
          if(entry["contenttype"] === MIME_DIRECTORY && mode === OM_RW) {
            onerror(new IDBFSError(T_OPEN, E_ISDIR));
            return;
          } else {
            complete();
          }
        }
        function complete() {
          var ofd;
          ofd = new OpenFileDescription(pathname, entry, flags, mode);
          var fd = new FileDescriptor(ofd);
          debug.info("open <--");
          if(callback && "function" === typeof callback) {              
            callback.call(undefined, undefined, fd);
          }
        }
      };      
      getRequest.onerror = onerror;
    }

    function close(fd, callback) {
      debug.info("close -->");
      var onerror = genericIDBErrorHandler("close", callback);
      if(!fds.hasOwnProperty(fd.descriptor)) {
        onerror(new IDBFSError(T_CLOSE, E_BADF));
        return;
      }
      var ofd = fds[fd.descriptor];
      ofd.valid = false;
      if(!ofd.valid && !ofd.pending) {
        debug.info("close <--");
        callback.call()
      } else {        
        ofd.oncomplete = callback;
      }
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
      getRequest.onerror = onerror;
    }

    function link(oldpath, newpath, callback) {

    }

    function unlink(pathname, callback) {
      debug.info("unlink -->");
      pathname = path.normalize(pathname);
      var transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
      var metaStore = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = metaStore.index(NAME_INDEX);
      var onerror = genericIDBErrorHandler("unlink", callback);

      stat(transaction, pathname, function(error, entry) {
        if(error) {
          onerror(new IDBFSError(T_UNLINK, error));
          return;
        }
        if(MIME_DIRECTORY === entry["contenttype"]) {
          onerror(new IDBFSError(T_UNLINK, E_ISDIR));
          return;
        }
        var unlinkRequest = metaStore.delete(entry["name"]);
        unlinkRequest.onsuccess = function(e) {
          // We don't support links, so this entry is the only entry for the file data
          var transaction = db.transaction([FILE_STORE_NAME], IDB_RW);
          var fileStore = transaction.objectStore(FILE_STORE_NAME);
          var deleteRequest = fileStore.delete(entry["oid"]);
          deleteRequest.onsuccess = function(e) {
            debug.info("unlink <--");
            if(callback && "function" === typeof callback) {              
              callback.call(undefined, undefined);
            }
          };
          deleteRequest.onerror = onerror;
        };
        unlinkRequest.onerror = onerror;
      });
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
    // this.link = link;
    this.unlink = unlink;
    this.api = api;

    // DEBUG
    function dump(element, callback, clear) {
      if(clear) {
        element.innerHTML = "";
      }
      element.innerHTML += "Metadata://<br>";
      var transaction = db.transaction([METADATA_STORE_NAME], IDB_RO);
      var metaStore = transaction.objectStore(METADATA_STORE_NAME);      
      var metaRequest = metaStore.openCursor();
      metaRequest.onsuccess = function(e) {
        var metaCursor = e.target.result;
        if(metaCursor) {
          element.innerHTML += JSON.stringify(metaCursor.value) + "<br>";            
          metaCursor.continue();        
        } else {
          element.innerHTML += "Files://<br>"
          transaction = db.transaction([FILE_STORE_NAME], IDB_RO);
          var fileStore = transaction.objectStore(FILE_STORE_NAME);          
          var fileRequest = fileStore.openCursor();
          fileRequest.onsuccess = function(e) {
            var fileCursor = e.target.result;
            if(fileCursor) {
              element.innerHTML += JSON.stringify(fileCursor.key) + "<br>";            
              fileCursor.continue(); 
            } else {
              element.innerHTML += "-----------------<br>";
              if(callback && "function" === typeof callback) {              
                callback.call();
              }
            }
          }
        }
      };
    }
    this.dump = dump;
  }

  function mount(name, callback, optFormat) {
    debug.info("mount -->");
    optFormat = (IDBFS.FORMAT === optFormat) ? true : false;
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
      metadata.createIndex(OBJECT_ID_INDEX, OBJECT_ID_INDEX_KEY_PATH, {unique: false});
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
    path: path,

    FORMAT: "IDBFS_FORMAT"
  };

  return IDBFS;

});