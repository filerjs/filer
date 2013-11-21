define(function(require) {

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  var _ = require('lodash');
  var when = require('when');

  // TextEncoder and TextDecoder will either already be present, or use this shim.
  // Because of the way the spec is defined, we need to get them off the global.
  require('encoding-indexes');
  require('encoding');

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
  var EFileSystemError = require('src/error').EFileSystemError;

  var FS_FORMAT = require('src/constants').FS_FORMAT;
  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var ROOT_NODE_ID = require('src/constants').ROOT_NODE_ID;
  var IDB_RW = require('src/constants').IDB_RW;
  var IDB_RO = require('src/constants').IDB_RO;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;
  var METADATA_STORE_NAME = require('src/constants').METADATA_STORE_NAME;
  var FS_READY = require('src/constants').FS_READY;
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
  }

  /*
   * OpenFileDescription
   */

  function OpenFileDescription(id, flags, position) {
    this.id = id;
    this.flags = flags;
    this.position = position;
  }

  /*
   * Node
   */

  function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, nlinks, version) {
    var now = Date.now();

    this.id = id || hash(guid());
    this.mode = mode || MODE_FILE;  // node type (file, directory, etc)
    this.size = size || 0; // size (bytes for files, entries for directories)
    this.atime = atime || now; // access time
    this.ctime = ctime || now; // creation time
    this.mtime = mtime || now; // modified time
    this.flags = flags || []; // file flags
    this.xattrs = xattrs || {}; // extended attributes
    this.nlinks = nlinks || 0; // links count
    this.version = version || 0; // node version
    this.blksize = undefined; // block size
    this.nblocks = 1; // blocks count
    this.data = hash(guid()); // id for data object
  }

  /*
   * Stats
   */

  function Stats(fileNode, devName) {
    this.node = fileNode.id;
    this.dev = devName;
    this.size = fileNode.size;
    this.nlinks = fileNode.nlinks;
    this.atime = fileNode.atime;
    this.mtime = fileNode.mtime;
    this.ctime = fileNode.ctime;
    this.type = fileNode.mode;
  }

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
    var parentPath = dirname(path);

    function check_root_directory_node(error, rootDirectoryNode) {
      if(error) {
        callback(error);
      } else if(!rootDirectoryNode) {
        callback(new ENoEntry('path does not exist'));
      } else {
        callback(undefined, rootDirectoryNode);
      }
    }

    // in: parent directory node
    // out: parent directory data
    function read_parent_directory_data(error, parentDirectoryNode) {
      if(error) {
        callback(error);
      } else if(!parentDirectoryNode.type == MODE_DIRECTORY) {
        callback(new ENotDirectory('a component of the path prefix is not a directory'));
      } else {
        read_object(objectStore, parentDirectoryNode.data, get_node_id_from_parent_directory_data);
      }
    }

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
    }

    if(ROOT_DIRECTORY_NAME == name) {
      read_object(objectStore, ROOT_NODE_ID, check_root_directory_node);
    } else {
      find_node(objectStore, parentPath, read_parent_directory_data);
    }
  }

  /*
   * read_object
   */

  function read_object(context, id, callback) {
    context.get(id, callback);
  }

  /*
   * write_object
   */

  function write_object(context, object, id, callback) {
    context.put(id, object, callback);
  }

  /*
   * delete_object
   */

  function delete_object(context, id, callback) {
    context.delete(id, callback);
  }

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
    }

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        write_object(objectStore, directoryData, directoryNode.data, callback);
      }
    }

    find_node(objectStore, ROOT_DIRECTORY_NAME, write_directory_node);
  }

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
    }

    function write_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        directoryNode = new Node(undefined, MODE_DIRECTORY);
        directoryNode.nlinks += 1;
        write_object(objectStore, directoryNode, directoryNode.id, write_directory_data);
      }
    }

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        write_object(objectStore, directoryData, directoryNode.data, update_parent_directory_data);
      }
    }

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
        write_object(objectStore, parentDirectoryData, parentDirectoryNode.data, callback);
      }
    }

    find_node(objectStore, path, check_if_directory_exists);
  }

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
      } else if(ROOT_DIRECTORY_NAME == name) {
        callback(new EBusy());
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
    }

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        read_object(objectStore, parentDirectoryNode.data, remove_directory_entry_from_parent_directory_node);
      }
    }

    function remove_directory_entry_from_parent_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        delete parentDirectoryData[name];
        write_object(objectStore, parentDirectoryData, parentDirectoryNode.data, remove_directory_node);
      }
    }

    function remove_directory_node(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, directoryNode.id, remove_directory_data);
      }
    }

    function remove_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, directoryNode.data, callback);
      }
    }

    find_node(objectStore, path, check_if_directory_exists);
  }

  function open_file(fs, objectStore, path, flags, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var directoryEntry;
    var fileNode;
    var fileData;

    if(ROOT_DIRECTORY_NAME == name) {
      if(_(flags).contains(O_WRITE)) {
        callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
      } else {
        find_node(objectStore, path, set_file_node);
      }
    } else {
      find_node(objectStore, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        read_object(objectStore, directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).has(name)) {
          if(_(flags).contains(O_EXCLUSIVE)) {
            callback(new ENoEntry('O_CREATE and O_EXCLUSIVE are set, and the named file exists'));
          } else {
            directoryEntry = directoryData[name];
            if(directoryEntry.type == MODE_DIRECTORY && _(flags).contains(O_WRITE)) {
              callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
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
    }

    function set_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        callback(undefined, fileNode);
      }
    }

    function write_file_node() {
      fileNode = new Node(undefined, MODE_FILE);
      fileNode.nlinks += 1;
      write_object(objectStore, fileNode, fileNode.id, write_file_data);
    }

    function write_file_data(error) {
      if(error) {
        callback(error);
      } else {
        fileData = new Uint8Array(0);
        write_object(objectStore, fileData, fileNode.data, update_directory_data);
      }
    }

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_FILE);
        write_object(objectStore, directoryData, directoryNode.data, handle_update_result);
      }
    }

    function handle_update_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(undefined, fileNode);
      }
    }
  }

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
    }

    function update_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileData = result;
        var _position = (!(undefined === position || null === position)) ? position : ofd.position;
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

        write_object(objectStore, newData, fileNode.data, update_file_node);
      }
    }

    function update_file_node(error) {
      if(error) {
        callback(error);
      } else {
        write_object(objectStore, fileNode, fileNode.id, return_nbytes);
      }
    }

    function return_nbytes(error) {
      if(error) {
        callback(error);
      } else {
        callback(undefined, length);
      }
    }
  }

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
    }

    function handle_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileData = result;
        var _position = (!(undefined === position || null === position)) ? position : ofd.position;
        length = (_position + length > buffer.length) ? length - _position : length;
        var dataView = fileData.subarray(_position, _position + length);
        buffer.set(dataView, offset);
        if(undefined === position) {
          ofd.position += length;
        }
        callback(undefined, length);
      }
    }
  }

  function stat_file(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);

    find_node(objectStore, path, check_file);

    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(undefined, result);
      }
    }
  }

  function fstat_file(objectStore, ofd, callback) {
    read_object(objectStore, ofd.id, check_file);

    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(undefined, result);
      }
    }
  }

  function link_node(objectStore, oldpath, newpath, callback) {
    oldpath = normalize(oldpath);
    var oldname = basename(oldpath);
    var oldParentPath = dirname(oldpath);

    newpath = normalize(newpath);
    var newname = basename(newpath);
    var newParentPath = dirname(newpath);

    var oldDirectoryNode;
    var oldDirectoryData;
    var newDirectoryNode;
    var newDirectoryData;
    var fileNode;

    find_node(objectStore, oldParentPath, read_old_directory_data);

    function read_old_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        oldDirectoryNode = result;
        read_object(objectStore, oldDirectoryNode.data, check_if_old_file_exists);
      }
    }

    function check_if_old_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        oldDirectoryData = result;
        if(!_(oldDirectoryData).has(oldname)) {
          callback(new ENoEntry('a component of either path prefix does not exist'));
        } else {
          find_node(objectStore, newParentPath, read_new_directory_data);
        }
      }
    }

    function read_new_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        newDirectoryNode = result;
        read_object(objectStore, newDirectoryNode.data, check_if_new_file_exists);
      }
    }

    function check_if_new_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        newDirectoryData = result;
        if(_(newDirectoryData).has(newname)) {
          callback(new EExists('newpath resolves to an existing file'));
        } else {
          newDirectoryData[newname] = oldDirectoryData[oldname];
          write_object(objectStore, newDirectoryData, newDirectoryNode.data, read_directory_entry);
        }
      }
    }

    function read_directory_entry(error, result) {
      if(error) {
        callback(error);
      } else {
        read_object(objectStore, newDirectoryData[newname].id, update_file_node);
      }
    }

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks += 1;
        write_object(objectStore, fileNode, fileNode.id, callback);
      }
    }
  }

  function unlink_node(objectStore, path, callback) {
    path = normalize(path);
    name = basename(path);
    parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var fileNode;

    find_node(objectStore, parentPath, read_directory_data);

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        read_object(objectStore, directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(!_(directoryData).has(name)) {
          callback(new ENoEntry('a component of the path does not name an existing file'));
        } else {
          read_object(objectStore, directoryData[name].id, update_file_node);
        }
      }
    }

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks -= 1;
        if(fileNode.nlinks < 1) {
          delete_object(objectStore, fileNode.id, delete_file_data);
        } else {
          write_object(objectStore, fileNode, fileNode.id, update_directory_data);
        }
      }
    }

    function delete_file_data(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, fileNode.data, update_directory_data);
      }
    }

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        delete directoryData[name];
        write_object(objectStore, directoryData, directoryNode.data, callback);
      }
    }
  }

  function read_directory(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);

    var directoryNode;
    var directoryData;

    find_node(objectStore, path, read_directory_data);

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        read_object(objectStore, directoryNode.data, handle_directory_data);
      }
    }

    function handle_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        var files = Object.keys(directoryData);
        callback(undefined, files);
      }
    }
  }

  function validate_flags(flags) {
    if(!_(O_FLAGS).has(flags)) {
      return null;
    } else {
      return O_FLAGS[flags];
    }
  }

  /*
   * FileSystem
   */

  function IndexedDBDatabase(db) {
    this.db = db;
  }
  function transaction(stores, mode, callback) {
    var tx = this.db.transaction(stores, mode);
  }

  function WebSQLDatabase(db) {
    this.db = db;
  }
  function transaction() {

  }

  function FileSystem(name, flags) {
  }
  FileSystem.prototype._allocate_descriptor = function _allocate_descriptor(openFileDescription) {
    var fd = this.nextDescriptor ++;
    this.openFiles[fd] = openFileDescription;
    return fd;
  };
  FileSystem.prototype._release_descriptor = function _release_descriptor(fd) {
    delete this.openFiles[fd];
  };
  FileSystem.prototype._open = function _open(context, path, flags, callback) {
    var that = this;
    var deferred = when.defer();

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
    }

    flags = validate_flags(flags);
    if(!flags) {
      deferred.reject(new EInvalid('flags is not valid'));
    }

    open_file(that, context, path, flags, check_result);

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._close = function _close(fd, callback) {
    var deferred = when.defer();

    if(!_(this.openFiles).has(fd)) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      this._release_descriptor(fd);
      deferred.resolve();
    }

    deferred.promise.then(
      function() {
        callback();
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._mkdir = function _mkdir(context, path, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }

    make_directory(context, path, check_result);

    deferred.promise.then(
      function() {
        callback();
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._rmdir = function _rmdir(context, path, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }

    remove_directory(context, path, check_result);

    deferred.promise.then(
      function() {
        callback();
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._stat = function _stat(context, path, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error, result) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        var stats = new Stats(result, that.name);
        deferred.resolve(stats);
      }
    }

    stat_file(context, path, check_result);

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._fstat = function _fstat(context, fd, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error, result) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        var stats = new Stats(result, that.name);
        deferred.resolve(stats);
      }
    }

    var ofd = that.openFiles[fd];

    if(!ofd) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      fstat_file(context, ofd, check_result);
    }

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._link = function _link(context, oldpath, newpath, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }

    link_node(context, oldpath, newpath, check_result);

    deferred.promise.then(
      function(result) {
        callback();
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._unlink = function _unlink(context, path, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }

    unlink_node(context, path, check_result);

    deferred.promise.then(
      function(result) {
        callback();
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._read = function _read(context, fd, buffer, offset, length, position, callback) {
    var that = this;
    var deferred = when.defer();

    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve(nbytes);
      }
    }

    var ofd = that.openFiles[fd];

    if(!ofd) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_READ)) {
      deferred.reject(new EBadFileDescriptor('descriptor does not permit reading'));
    } else {
      read_data(context, ofd, buffer, offset, length, position, check_result);
    }

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._readFile = function _readFile(context, path, options, callback) {
    var that = this;
    var deferred = when.defer();

    if(!options) {
      options = { encoding: null, flag: 'r' };
    } else if(typeof options === "function") {
      callback = options;
      options = { encoding: null, flag: 'r' };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: 'r' };
    }

    var flags = validate_flags(options.flag || 'r');
    if(!flags) {
      deferred.reject(new EInvalid('flags is not valid'));
    }

    open_file(that, context, path, flags, function(err, fileNode) {
      if(err) {
        // TODO: abort transaction?
        return deferred.reject(err);
      }
      var ofd = new OpenFileDescription(fileNode.id, flags, 0);
      var fd = that._allocate_descriptor(ofd);

      fstat_file(context, ofd, function(err2, fstatResult) {
        if(err2) {
          // TODO: abort transaction?
          return deferred.reject(err2);
        }

        var stats = new Stats(fstatResult, that.name);
        var size = stats.size;
        var buffer = new Uint8Array(size);

        read_data(context, ofd, buffer, 0, size, 0, function(err3, nbytes) {
          if(err3) {
            // TODO: abort transaction?
            return deferred.reject(err3);
          }
          that._release_descriptor(fd);

          var data;
          if(options.encoding === 'utf8') {
            data = new TextDecoder('utf-8').decode(buffer);
          } else {
            data = buffer;
          }
          deferred.resolve(data);
        });
      });

    });

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._write = function _write(context, fd, buffer, offset, length, position, callback) {
    var that = this;
    var deferred = when.defer();

    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        deferred.reject(error);
      } else {
        deferred.resolve(nbytes);
      }
    }

    var ofd = that.openFiles[fd];

    if(!ofd) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      deferred.reject(new EBadFileDescriptor('descriptor does not permit writing'));
    } else if(buffer.length - offset < length) {
      deferred.reject(new EIO('intput buffer is too small'));
    } else {
      write_data(context, ofd, buffer, offset, length, position, check_result);
    }

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._writeFile = function _writeFile(context, path, data, options, callback) {
    var that = this;
    var deferred = when.defer();

    if(!options) {
      options = { encoding: 'utf8', flag: 'w' };
    } else if(typeof options === "function") {
      callback = options;
      options = { encoding: 'utf8', flag: 'w' };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: 'w' };
    }

    var flags = validate_flags(options.flag || 'w');
    if(!flags) {
      deferred.reject(new EInvalid('flags is not valid'));
    }

    if(typeof data === "string" && options.encoding === 'utf8') {
      data = new TextEncoder('utf-8').encode(data);
    }

    open_file(that, context, path, flags, function(err, fileNode) {
      if(err) {
        // TODO: abort transaction?
        return deferred.reject(err);
      }
      var ofd = new OpenFileDescription(fileNode.id, flags, 0);
      var fd = that._allocate_descriptor(ofd);

      write_data(context, ofd, data, 0, data.length, 0, function(err2, nbytes) {
        if(err2) {
          // TODO: abort transaction?
          return deferred.reject(err2);
        }
        that._release_descriptor(fd);
        deferred.resolve();
      });
    });

    deferred.promise.then(
      function() {
        callback(undefined);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._getxattr = function _getxattr(path, name, callback) {

  };
  FileSystem.prototype._setxattr = function _setxattr(path, name, value, callback) {

  };
  FileSystem.prototype._lseek = function _lseek(context, fd, offset, whence, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error, offset) {
      if(error) {
        deferred.reject(error);
      } else {
        deferred.resolve(offset);
      }
    }

    function update_descriptor_position(error, stats) {
      if(error) {
        deferred.reject(error);
      } else {
        if(stats.size + offset < 0) {
          deferred.reject(new EInvalid('resulting file offset would be negative'));
        } else {
          ofd.position = stats.size + offset;
          deferred.resolve(ofd.position);
        }
      }
    }

    var ofd = that.openFiles[fd];

    if(!ofd) {
      deferred.reject(new EBadFileDescriptor('invalid file descriptor'));
    }

    if('SET' === whence) {
      if(offset < 0) {
        deferred.reject(new EInvalid('resulting file offset would be negative'));
      } else {
        ofd.position = offset;
        deferred.resolve(ofd.position);
      }
    } else if('CUR' === whence) {
      if(ofd.position + offset < 0) {
        deferred.reject(new EInvalid('resulting file offset would be negative'));
      } else {
        ofd.position += offset;
        deferred.resolve(ofd.position);
      }
    } else if('END' === whence) {
      fstat_file(context, ofd, update_descriptor_position);
    } else {
      deferred.reject(new EInvalid('whence argument is not a proper value'));
    }

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._readdir = function _readdir(context, path, callback) {
    var that = this;
    var deferred = when.defer();

    function check_result(error, files) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve(files);
      }
    }

    read_directory(context, path, check_result);

    deferred.promise.then(
      function(result) {
        callback(undefined, result);
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._utimes = function _utimes(path, atime, mtime, callback) {

  };
  FileSystem.prototype._rename = function _rename(context, oldpath, newpath, callback) {
    var that = this;
    var deferred = when.defer();

    link_node(context, oldpath, newpath, unlink_old_node);

    function unlink_old_node(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        unlink_node(context, oldpath, check_result);
      }
    }

    function check_result(error) {
      if(error) {
        // if(transaction.error) transaction.abort();
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }

    deferred.promise.then(
      function(result) {
        callback();
      },
      function(error) {
        callback(error);
      }
    );
  };
  FileSystem.prototype._truncate = function _truncate(path, length, callback) {

  };
  FileSystem.prototype._ftruncate = function _ftruncate(fd, length, callback) {

  };
  FileSystem.prototype._symlink = function _symlink(fd, length, callback) {

  };
  FileSystem.prototype._readlink = function _readlink(fd, length, callback) {

  };
  FileSystem.prototype._realpath = function _realpath(fd, length, callback) {

  };
  FileSystem.prototype._lstat = function _lstat(fd, length, callback) {

  };

  function IndexedDBContext(objectStore) {
    this.objectStore = objectStore;
  }
  IndexedDBContext.prototype.get = function(key, callback) {
    try {
      var request = this.objectStore.get(key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(undefined, result);
      }
      request.onerror = function onerror(error) {
        callback(error);
      }
    } catch(error) {
      callback(new EIO(error.message));
    }
  }
  IndexedDBContext.prototype.put = function(key, value, callback) {
    try {
      var request = this.objectStore.put(value, key);
      request.onsuccess = function onsuccess(event) {
        var result = event.target.result;
        callback(undefined, result);
      };
      request.onerror = function onerror(error) {
        callback(error);
      };
    } catch(error) {
      callback(new EIO(error.message));
    }
  }
  IndexedDBContext.prototype.delete = function(key, callback) {
    var request = this.objectStore.delete(key);
    request.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    request.onerror = function(error) {
      callback(error);
    };
  }

  function IndexedDBFileSystem(name, flags) {
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
      var transaction = db.transaction([FILE_STORE_NAME], IDB_RW);
      var files = transaction.objectStore(FILE_STORE_NAME);
      var context = new IndexedDBContext(files);

      function complete(error) {
        that.db = db;
        if(error) {
          that.readyState = FS_ERROR;
          deferred.reject(error);
        } else {
          that.readyState = FS_READY;
          deferred.resolve();
        }
      }

      if(format) {
        var clearRequest = files.clear();
        clearRequest.onsuccess = function onsuccess(event) {
          make_root_directory(context, complete);
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
    this.name = name;
  }
  IndexedDBFileSystem.prototype = new FileSystem();
  IndexedDBFileSystem.prototype.constructor = IndexedDBFileSystem;
  IndexedDBFileSystem.prototype.open = function open(path, flags, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._open(context, path, flags, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.close = function close(fd, callback) {
    this._close(fd, callback);
  }
  IndexedDBFileSystem.prototype.mkdir = function mkdir(path, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._mkdir(context, path, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.rmdir = function rmdir(path, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._rmdir(context, path, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.stat = function stat(path, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._stat(context, path, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.fstat = function fstat(fd, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._fstat(context, fd, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.link = function link(oldpath, newpath, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._link(context, oldpath, newpath, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.unlink = function unlink(path, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._unlink(context, path, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.read = function read(fd, buffer, offset, length, position, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._read(context, fd, buffer, offset, length, position, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.readFile = function readFile(path, options, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._readFile(context, path, options, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.write = function write(fd, buffer, offset, length, position, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._write(context, fd, buffer, offset, length, position, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.writeFile = function writeFile(path, data, options, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._writeFile(context, path, data, options, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.lseek = function lseek(fd, offset, whence, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._lseek(context, fd, offset, whence, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.readdir = function readdir(path, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._readdir(context, path, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }
  IndexedDBFileSystem.prototype.rename = function rename(oldpath, newpath, callback) {
    var fs = this;
    this.promise.then(
      function() {
        var transaction = fs.db.transaction([FILE_STORE_NAME], IDB_RW);
        var files = transaction.objectStore(FILE_STORE_NAME);
        var context = new IndexedDBContext(files);
        fs._rename(context, oldpath, newpath, callback);
      },
      function() {
        callback(new EFileSystemError('unknown error'));
      }
    );
  }

  // FIXME: WebSQL stuff, this needs implementation
  function WebSQLContext(transaction) {
    this.transaction = transaction;
  }
  WebSQLContext.prototype.get = function(key, callback) {
    try {

    } catch(error) {
      callback(new EIO(error.message));
    }
  }
  WebSQLContext.prototype.put = function(key, value, callback) {
    try {

    } catch(error) {
      callback(new EIO(error.message));
    }
  }
  WebSQLContext.prototype.delete = function(key, callback) {

  }

  function WebSQLFileSystem(name, flags) {
  }
  WebSQLFileSystem.prototype = new FileSystem();
  IndexedDBFileSystem.prototype.constructor = WebSQLFileSystem;

  return {
    FileSystem: IndexedDBFileSystem
  };

});