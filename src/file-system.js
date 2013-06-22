define(function(require) {

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  var _ = require('lodash');
  var when = require('when');

  var normalize = require('src/path').normalize;
  var dirname = require('src/path').dirname;
  var basename = require('src/path').basename;

  var guid = require('src/shared').guid;
  var hash = require('src/shared').hash;
  var nop = require('src/shared').nop;

  var EExists = require('src/error').EExists;
  var EIsDirectory = require('src/error').EIsDirectory;
  var ENoEntry = require('src/error').ENoEntry;
  var EBusy = require('src/error').EBusy;
  var ENotEmpty = require('src/error').ENotEmpty;
  var ENotDirectory = require('src/error').ENotDirectory;
  var EBadFileDescriptor = require('src/error').EBadFileDescriptor;
  var ENotImplemented = require('src/error').ENotImplemented;
  var ENotMounted = require('src/error').ENotMounted;
  var EInvalid = require('src/error').EInvalid;
  var EIO = require('src/error').EIO;

  var FS_FORMAT = require('src/constants').FS_FORMAT;
  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var ROOT_NODE_ID = require('src/constants').ROOT_NODE_ID;
  var IDB_RW = require('src/constants').IDB_RW;
  var IDB_RO = require('src/constants').IDB_RO;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;
  var METADATA_STORE_NAME = require('src/constants').METADATA_STORE_NAME;
  var FS_READY = require('src/constants').READY;
  var FS_PENDING = require('src/constants').FS_PENDING;
  var FS_ERROR = require('src/constants').FS_ERROR;
  var O_READ = require('src/constants').O_READ;
  var O_WRITE = require('src/constants').O_WRITE;
  var O_CREATE = require('src/constants').O_CREATE;
  var O_EXCLUSIVE = require('src/constants').O_EXCLUSIVE;
  var O_TRUNCATE = require('src/constants').O_TRUNCATE;
  var O_APPEND = require('src/constants').O_APPEND;
  var O_FLAGS = require('src/constants').O_FLAGS;

  /*
   * DirectoryEntry
   */

  function DirectoryEntry(id, type) {
    this.id = id;
    this.type = type || MODE_FILE;
  };

  /*
   * OpenFileDescription
   */

  function OpenFileDescription(id, flags, position) {
    this.id = id;
    this.flags = flags;
    this.position = position;
  };

  /*
   * Node
   */

  function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, nlinks, version) {
    var now = Date.now();

    this.id = id || hash(guid()),
    this.mode = mode || MODE_FILE;  // node type (file, directory, etc)
    this.size = size || 0; // size (bytes for files, entries for directories)
    this.atime = atime || now; // access time
    this.ctime = ctime || now; // creation time
    this.mtime = mtime || now; // modified time
    this.flags = flags || []; // file flags
    this.xattrs = xattrs || {}; // extended attributes
    this.nlinks = nlinks || 0; // links count
    this.version = version || 0; // node version
    this.data = hash(guid()) // id for data object
  };

  /*
   * find_node
   */

  // in: file or directory path
  // out: node structure, or error
  function find_node(objectStore, path, callback) {
    path = normalize(path);
    if(!path) {
      return callback(new ENoEntry('path is an empty string'));
    }
    var name = basename(path);

    if(ROOT_DIRECTORY_NAME == name) {
      function check_root_directory_node(error, rootDirectoryNode) {
        if(error) {
          callback(error);
        } else if(!rootDirectoryNode) {
          callback(new ENoEntry('path does not exist'));
        } else {
          callback(undefined, rootDirectoryNode);
        }
      };

      read_object(objectStore, ROOT_NODE_ID, check_root_directory_node);
    } else {
      // in: parent directory node
      // out: parent directory data
      function read_parent_directory_data(error, parentDirectoryNode) {
        if(error) {
          callback(error);
        } else if(!_(parentDirectoryNode).has('data') || !parentDirectoryNode.type == MODE_DIRECTORY) {
          callback(new ENotDirectory('a component of the path prefix is not a directory'));
        } else {
          read_object(objectStore, parentDirectoryNode.data, get_node_id_from_parent_directory_data);
        }
      };

      // in: parent directory data
      // out: searched node id
      function get_node_id_from_parent_directory_data(error, parentDirectoryData) {
        if(error) {
          callback(error);
        } else {
          if(!_(parentDirectoryData).has(name)) {
            callback(new ENoEntry('path does not exist'));
          } else {
            var nodeId = parentDirectoryData[name].id;
            read_object(objectStore, nodeId, callback);
          }
        }
      };

      var parentPath = dirname(path);
      find_node(objectStore, parentPath, read_parent_directory_data);
    }
  };

  /*
   * read_object
   */

  function read_object(objectStore, id, callback) {
    var getRequest = objectStore.get(id);
    getRequest.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    getRequest.onerror = function onerror(error) {
      callback(error);
    };
  };

  /*
   * write_object
   */

  function write_object(objectStore, object, id, callback) {
    var putRequest = objectStore.put(object, id);
    putRequest.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    putRequest.onerror = function onerror(error) {
      callback(error);
    };
  };

  /*
   * delete_object
   */

  function delete_object(objectStore, id, callback) {
    var deleteRequest = objectStore.delete(id);
    deleteRequest.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    deleteRequest.onerror = function(error) {
      callback(error);
    };
  };

  /*
   * make_root_directory
   */

  // Note: this should only be invoked when formatting a new file system
  function make_root_directory(objectStore, callback) {
    var directoryNode;
    var directoryData;

    function write_directory_node(error, existingNode) {
      if(!error && existingNode) {
        callback(new EExists());
      } else if(error && !error instanceof ENoEntry) {
        callback(error);
      } else {
        directoryNode = new Node(ROOT_NODE_ID, MODE_DIRECTORY);
        directoryNode.nlinks += 1;
        write_object(objectStore, directoryNode, directoryNode.id, write_directory_data);
      }
    };

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        write_object(objectStore, directoryData, directoryNode.data, callback);
      }
    };

    find_node(objectStore, ROOT_DIRECTORY_NAME, write_directory_node);
  };

  /*
   * make_directory
   */

  function make_directory(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function check_if_directory_exists(error, result) {
      if(!error && result) {
        callback(new EExists());
      } else if(error && !error instanceof ENoEntry) {
        callback(error);
      } else {
        find_node(objectStore, parentPath, read_parent_directory_data);
      }
    }

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        read_object(objectStore, parentDirectoryNode.data, write_directory_node);
      }
    };

    function write_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        directoryNode = new Node(undefined, MODE_DIRECTORY);
        directoryNode.nlinks += 1;
        write_object(objectStore, directoryNode, directoryNode.id, write_directory_data);
      }
    };

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        write_object(objectStore, directoryData, directoryNode.data, update_parent_directory_data);
      }
    };

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
        write_object(objectStore, parentDirectoryData, parentDirectoryNode.data, callback);
      }
    }

    find_node(objectStore, path, check_if_directory_exists);
  };

  /*
   * remove_directory
   */

  function remove_directory(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function check_if_directory_exists(error, result) {
      if(error) {
        callback(error);
      } else if(!result) {
        callback(new ENoEntry());
      } else {
        directoryNode = result;
        read_object(objectStore, directoryNode.data, check_if_directory_is_empty);
      }
    }

    function check_if_directory_is_empty(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).size() > 0) {
          callback(new ENotEmpty());
        } else {
          find_node(objectStore, parentPath, read_parent_directory_data);
        }
      }
    };

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        read_object(objectStore, parentDirectoryNode.data, remove_directory_entry_from_parent_directory_node);
      }
    };

    function remove_directory_entry_from_parent_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        delete parentDirectoryData[name];
        write_object(objectStore, parentDirectoryData, parentDirectoryNode.data, remove_directory_node);
      }
    };

    function remove_directory_node(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, directoryNode.id, remove_directory_data);
      }
    };

    function remove_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, directoryNode.data, callback);
      }
    };

    find_node(objectStore, path, check_if_directory_exists);
  };

  function open_file(fs, objectStore, path, flags, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var directoryEntry;
    var fileNode;
    var fileData;

    find_node(objectStore, parentPath, read_directory_data);

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        read_object(objectStore, directoryNode.data, check_if_file_exists);
      }
    };

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).has(name)) {
          if(_(flags).contains(O_EXCLUSIVE)) {
            callback(new ENoEntry('O_CREATE and O_EXCLUSIVE are set, and the named file exists'))
          } else {
            directoryEntry = directoryData[name];
            if(directoryEntry.type == MODE_DIRECTORY) {
              callback(new EIsDirectory('the named file is a directory and O_WRITE is set'))
            } else {
              read_object(objectStore, directoryEntry.id, set_file_node);
            }
          }
        } else {
          if(!_(flags).contains(O_CREATE)) {
            callback(new ENoEntry('O_CREATE is not set and the named file does not exist'));
          } else {
            write_file_node();
          }
        }
      }
    };

    function set_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        callback(undefined, fileNode);
      }
    };

    function write_file_node() {
      fileNode = new Node(undefined, MODE_FILE);
      fileNode.nlinks += 1;
      write_object(objectStore, fileNode, fileNode.id, write_file_data);
    };

    function write_file_data(error) {
      if(error) {
        callback(error);
      } else {
        fileData = {};
        write_object(objectStore, fileData, fileNode.data, update_directory_data);
      }
    };

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_FILE);
        write_object(objectStore, directoryData, directoryNode.data, handle_update_result);
      }
    };

    function handle_update_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(undefined, fileNode);
      }
    };
  };

  function write_data(objectStore, ofd, buffer, offset, length, position, callback) {
    var fileNode;
    var fileData;

    read_object(objectStore, ofd.id, read_file_data);

    function read_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        read_object(objectStore, fileNode.data, update_file_data);
      }
    };

    function update_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileData = result;
        var _position = (undefined !== position) ? position : ofd.position;
        var newSize = Math.max(fileData.length, _position + length);
        var newData = new Uint8Array(newSize);
        if(fileData) {
          newData.set(fileData);
        }
        newData.set(buffer, _position);
        if(undefined === position) {
          ofd.position += length;
        }

        fileNode.size = newSize;
        fileNode.mtime = Date.now();
        fileNode.version += 1;

        write_object(objectStore, fileNode.data, update_file_node);
      }
    };

    function update_file_node(error) {
      if(error) {
        callback(error);
      } else {
        write_object(objectStore, fileNode.id, return_nbytes);
      }
    };

    function return_nbytes(error) {
      if(error) {
        callback(error);
      } else {
        callback(undefined, nbytes);
      }
    };
  };

  function read_data(objectStore, ofd, buffer, offset, length, position, callback) {
    var fileNode;
    var fileData;

    read_object(objectStore, ofd.id, read_file_data);

    function read_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        read_object(objectStore, fileNode.data, handle_file_data);
      }
    };

    function handle_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileData = result;
        var _position = (undefined !== position) ? position : ofd.position;
        length = (_position + length > buffer.length) ? length - _position : length;
        var dataView = fileData.subarray(_position, _position + length);
        if(undefined === position) {
          ofd.position += length;
        }
        callback(undefined, length);
      }
    };
  };

  /*
   * FileSystem
   */

  function FileSystem(name, flags) {
    var format = _(flags).contains(FS_FORMAT);
    var that = this;

    var deferred = when.defer();
    this.promise = deferred.promise;

    var openRequest = indexedDB.open(name);
    openRequest.onupgradeneeded = function onupgradeneeded(event) {
      var db = event.target.result;

      if(db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.deleteObjectStore(FILE_STORE_NAME);
      }
      var files = db.createObjectStore(FILE_STORE_NAME);

      if(db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.deleteObjectStore(METADATA_STORE_NAME);
      }
      var metadata = db.createObjectStore(METADATA_STORE_NAME);

      format = true;
    };
    openRequest.onsuccess = function onsuccess(event) {
      var db = event.target.result;

      function complete(error) {
        if(error) {
          that.readyState = FS_ERROR;
          deferred.reject(error);
        } else {
          that.readyState = FS_READY;
          that.db = db;
          deferred.resolve();
        }
      };

      if(format) {
        var transaction = db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);

        var clearRequest = files.clear();
        clearRequest.onsuccess = function onsuccess(event) {
          make_root_directory(files, complete);
        };
        clearRequest.onerror = function onerror(error) {
          complete(error);
        };
      } else {
        complete();
      }
    };
    openRequest.onerror = function onerror(error) {
      this.readyState = FS_ERROR;
      deferred.reject(error);
    };

    var nextDescriptor = 1;
    var openFiles = {};

    this.readyState = FS_PENDING;
    this.db = null;
    this.nextDescriptor = nextDescriptor;
    this.openFiles = openFiles;
  };
  FileSystem.prototype._allocate_descriptor = function _allocate_descriptor(openFileDescription) {
    var fd = this.nextDescriptor ++;
    this.openFiles[fd] = openFileDescription;
    return fd;
  };
  FileSystem.prototype._release_descriptor = function _release_descriptor(fd) {
    delete this.openFiles[fd];
  };
  FileSystem.prototype.open = function open(path, flags) {
    var that = this;
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error, fileNode) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        var position;
        if(_(flags).contains(O_APPEND)) {
          position = fileNode.size;
        } else {
          position = 0;
        }
        var openFileDescription = new  OpenFileDescription(fileNode.id, flags, position);
        var fd = that._allocate_descriptor(openFileDescription);
        deferred.resolve(fd);
      }
    };

    if(!_(O_FLAGS).has(flags)) {
      deferred.reject(new EInvalid('flags is not valid'));
    } else {
      flags = O_FLAGS[flags];
    }

    open_file(this, files, path, flags, check_result);

    return deferred.promise;
  };
  FileSystem.prototype.close = function close(fd) {
    var deferred = when.defer();

    if(!_(this.openFiles).has(fd)) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      this._release_descriptor(fd);
      deferred.resolve();
    }

    return deferred.promise;
  };
  FileSystem.prototype.mkdir = function mkdir(path) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    };

    make_directory(files, path, check_result);
    return deferred.promise;
  };
  FileSystem.prototype.rmdir = function rmdir(path) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    };

    remove_directory(files, path, check_result);
    return deferred.promise;
  };
  FileSystem.prototype.stat = function stat(path) {

  };
  FileSystem.prototype.fstat = function fstat(fd) {

  };
  FileSystem.prototype.link = function link(oldpath, newpath) {

  };
  FileSystem.prototype.unlink = function unlink(path) {

  };
  FileSystem.prototype.getxattr = function getxattr(path, name) {

  };
  FileSystem.prototype.setxattr = function setxattr(path, name, value) {

  };
  FileSystem.prototype.read = function read(fd, buffer, offset, length, position) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        deferred.reject(error);
      } else {
        deferred.resolve(nbytes);
      }
    };

    var ofd = this.openFiles[fd];

    if(!ofd) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(flags).contains(O_READ)) {
      deferred.reject(new EBadFileDescriptor('descriptor does not permit reading'));
    } else {
      read_data(files, ofd, buffer, offset, length, position, check_result);
    }

    // TODO: check buffer length

    return deferred.promise;
  };
  FileSystem.prototype.write = function write(fd, buffer, offset, length, position) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        deferred.reject(error);
      } else {
        deferred.resolve(nbytes);
      }
    };

    var ofd = this.openFiles[fd];

    if(!ofd) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(flags).contains(O_WRITE)) {
      deferred.reject(new EBadFileDescriptor('descriptor does not permit writing'));
    } else if(buffer.length - offset < length) {
      deferred.reject(new EIO('intput buffer is too small'));
    } else {
      write_data(files, ofd, buffer, offset, length, position, check_result);
    }

    // TODO: check buffer length

    return deferred.promise;
  };
  FileSystem.prototype.seek = function seek(fd, offset, origin) {

  };

  return {
    FileSystem: FileSystem,
  };

});