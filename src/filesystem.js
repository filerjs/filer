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

  function FileEntry(fullpath, file) {
    return {
      name: fullpath,
      parent: path.dirname(fullpath),
      file: file,
      type: "application/file"
    }
  }

  function DirectoryEntry(fullpath, atime, ctime, mtime, xattrs) {
    var now = Date.now();
    return {
      name: fullpath,
      parent: path.dirname(fullpath),
      atime: atime || now,
      ctime: ctime || now,
      mtime: mtime || now,
      xattrs: xattrs || {},
      type: "application/directory"
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

  

  function genericErrorHandler(callback) {
    return function(transaction, error) {
      debug.error("error: ", error);
      if(transaction && !transaction.error) {
        try {
          transaction.abort();
        } catch(e) {
          // Transaction has is already completed or aborted, this is probably a programming error
          debug.warn("attempt to abort and already completed or aborted transaction");
        }
      }
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
            delete fds[descriptor];
            ofd.oncomplete.call();
          }
        }
      }

      function read(buffer, callback) {
        debug.info("read -->");
        var onerror = genericErrorHandler(callback);
        if(!start()) {
          onerror(null, new BadFileDescriptorError());
          return;
        }
        transaction = db.transaction([FILE_STORE_NAME], IDB_RO);
        transaction.oncomplete = function(e) 
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
          getRequest.onerror = onerror.bind(null, transaction);
        } else if(MIME_DIRECTORY === ofd.entry["contenttype"]) {
          // NOT IMPLEMENTED
          onerror(transaction, new NotImplementedError());
        }
      }

      function write(buffer, callback) {
        debug.info("write -->");
        var onerror = genericErrorHandler(callback);        
        if(OM_RO === ofd.mode) {
          onerror(null, new BadFileDescriptorError());
          return;
        }
        if(!start()) {
          onerror(null, new BadFileDescriptorError());
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
              writeMetadataRequest.onerror = onerror.bind(null, transaction);
            }              
            readMetadataRequest.onerror = onerror.bind(null, transaction);
          };
          putRequest.onerror = onerror.bind(null, transaction);
        };
        getRequest.onerror = onerror.bind(null, transaction);
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
    function open(fullpath, flags, mode, callback) {
      debug.info("open -->");      
      fullpath = path.normalize(fullpath);
      transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
      var metaStore = transaction.objectStore(METADATA_STORE_NAME);
      var fileStore = transaction.objectStore(FILE_STORE_NAME);
      var nameIndex = metaStore.index(NAME_INDEX);
      var onerror = genericErrorHandler(callback);

      if(undefined === flags) {
        flags = [];
      } else if("string" === typeof flags) {
        flags = [flags];
      }

      var getRequest = nameIndex.get(fullpath);
      getRequest.onsuccess = function(e) {
        var entry = e.target.result;
        var file;
        if(!entry) {
          if(!_(flags).contains(OF_CREATE)) {
            onerror(transaction, new NoEntryError());
            return;
          } else {            
            file = new File();
            entry = new FileEntry(fullpath, file.handle);
            var createFileRequest = fileStore.put(file, file.handle);
            createFileRequest.onsuccess = function(e) {
              var createEntryRequest = fileStore.put(entry, fullpath);
              createEntryRequest.onsuccess = complete;
              createEntryRequest.onerror = onerror.bind(null, transaction);
            };
            createFileRequest.onerror = onerror.bind(null, transaction);            
          }
        } else {
          if(entry["type"] === MIME_DIRECTORY && mode === OM_RW) {
            onerror(transaction, new IsDirectoryError());
            return;
          } else {
            var getFileRequest = fileStore.get(entry.file);
            getFileRequest.onsuccess = function(e) {
              file = e.target.result;
              complete();
            };
            getFileRequest.onerror = onerror.bind(null, transaction);
          }
        }
        function complete() {
          var ofd;
          ofd = new OpenFileDescription(fullpath, file, flags, mode);
          var fd = new FileDescriptor(ofd);
          debug.info("open <--");
          if(callback && "function" === typeof callback) {              
            callback.call(undefined, undefined, fd);
          }
        }
      };      
      getRequest.onerror = onerror.bind(null, transaction);
    }

    function close(fd, callback) {
      debug.info("close -->");
      var onerror = genericErrorHandler(callback);
      if(!fds.hasOwnProperty(fd.descriptor)) {
        onerror(null, new BadFileDescriptorError());
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

    function mkdir(transaction, fullpath, callback) {      
      debug.info("mkdir -->");
      fullpath = path.normalize(fullpath);
      transaction = transaction || db.transaction([METADATA_STORE_NAME], IDB_RW);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);
      var onerror = genericErrorHandler(callback);

      var getRequest = nameIndex.get(fullpath);
      getRequest.onsuccess = function(e) {
        var result = e.target.result;
        if(result) {
          onerror(null, new PathExistsError());
        } else {
          var entry = new DirectoryEntry(fullpath);
          var directoryRequest = store.put(entry, fullpath);
          directoryRequest.onsuccess = function(e) {
            debug.info("mkdir <--");
            if(callback && "function" === typeof callback) {              
              callback.call(undefined, undefined);
            }
          };
          directoryRequest.onerror = onerror.bind(null, transaction);
        }
      };
      getRequest.onerror = onerror.bind(null, transaction);
    }

    function rmdir(fullpath, callback) {
      debug.info("rmdir -->");
      fullpath = path.normalize(fullpath);
      transaction = db.transaction([METADATA_STORE_NAME, FILE_STORE_NAME], IDB_RW);
      var metaStore = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = metaStore.index(NAME_INDEX);
      var parentIndex = metaStore.index(PARENT_INDEX);
      var onerror = genericErrorHandler(callback);

      var getRequest = nameIndex.get(fullpath);
      getRequest.onsuccess = function(e) {
        var result = e.target.result;
        if(!result) {
          onerror(transaction, new NoEntryError());
          return;
        } else {
          var contentRequest = parentIndex.get(fullpath);
          contentRequest.onsuccess = function(e) {
            var result = e.target.result;
            if(result) {
              onerror(transaction, new NotEmptyError());
              return;
            } else {
              var removeRequest = metaStore.delete(fullpath);
              removeRequest.onsuccess = function(e) {
                debug.info("rmdir <--");
                if(callback && "function" === typeof callback) {              
                  callback.call(undefined, undefined);
                }
              };
              removeRequest.onerror = onerror.bind(null, transaction);
            }
          };
          contentRequest.onerror = onerror.bind(null, transaction);
        }
      };
      getRequest.onerror = onerror.bind(null, transaction);
    }

    function stat(transaction, fullpath, callback) {
      debug.info("stat -->");
      fullpath = path.normalize(fullpath);
      transaction = transaction || db.transaction([METADATA_STORE_NAME], IDB_RO);
      var store = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = store.index(NAME_INDEX);
      var onerror = genericErrorHandler(callback);

      var getRequest = nameIndex.get(fullpath);
      getRequest.onsuccess = function(e) {        
        var result = e.target.result;
        if(!result) {
          onerror(transaction, new NoEntryError());
          return;
        } else {
          debug.info("stat <--");
          if(callback && "function" === typeof callback) {              
            callback.call(undefined, undefined, result);
          }
        }
      };
      getRequest.onerror = onerror.bind(null, transaction);
    }

    function link(oldpath, newpath, callback) {

    }

    function unlink(pathname, callback) {
      debug.info("unlink -->");
      pathname = path.normalize(pathname);
      var transaction = db.transaction([METADATA_STORE_NAME], IDB_RW);
      var metaStore = transaction.objectStore(METADATA_STORE_NAME);
      var nameIndex = metaStore.index(NAME_INDEX);
      var onerror = genericErrorHandler(callback);

      stat(transaction, pathname, function(error, entry) {
        if(error) {
          onerror(transaction, error);
          return;
        }
        if(MIME_DIRECTORY === entry["contenttype"]) {
          onerror(transaction, new IsDirectoryError());
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
          deleteRequest.onerror = onerror.bind(null, transaction);
        };
        unlinkRequest.onerror = onerror.bind(null, transaction);
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

  function mount(name, flags, callback) {
    debug.info("mount -->");
    indexedDB.deleteDatabase(name);
    var format = _(flags).contains("FORMAT");
    var onerror = genericErrorHandler(callback);
    var openRequest = indexedDB.open(name);
    openRequest.onupgradeneeded = function(e) {
      var db = e.target.result;
      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      var metadata = db.createObjectStore(METADATA_STORE_NAME);
      metadata.createIndex(PARENT_INDEX, PARENT_INDEX_KEY_PATH, {unique: false});
      metadata.createIndex(NAME_INDEX, NAME_INDEX_KEY_PATH, {unique: true});
      metadata.createIndex(OBJECT_ID_INDEX, OBJECT_ID_INDEX_KEY_PATH, {unique: false});
      var files = db.createObjectStore(FILE_STORE_NAME);

      format = true;
    };
    openRequest.onsuccess = function(e) {
      var db = e.target.result;
      var fs = new FileSystem(db);

      if(format) {
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
        clearRequest.onerror = onerror.bind(null, transaction);
      } else {
        debug.info("mount <--");
        if(callback && "function" === typeof callback) {
          callback.call(undefined, undefined, fs.api());
        }
      }
    };
    openRequest.onerror = onerror.bind(null, null);
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