define(function(require) {

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  var _ = require('lodash');
  var when = require('when');
  var Path = require('src/path');
  var guid = require("src/guid");
  require("crypto-js/rollups/sha256"); var Crypto = CryptoJS;

  var METADATA_STORE_NAME = 'metadata';
  var FILE_STORE_NAME = 'files';

  var IDB_RO = 'readonly';
  var IDB_RW = 'readwrite';

  var MODE_FILE = 'FILE';
  var MODE_DIRECTORY = 'DIRECTORY';
  var MODE_SYMBOLIC_LINK = 'SYMLINK';

  var BINARY_MIME_TYPE = 'application/octet-stream';
  var JSON_MIME_TYPE = 'application/json';

  var ROOT_DIRECTORY_NAME = '/'; // basename(normalize(path))
  var ROOT_NODE_ID = '8a5edab282632443219e051e4ade2d1d5bbc671c781051bf1437897cbdfea0f1'; // sha256(ROOT_DIRECTORY_NAME)

  // FileSystem flags
  var FS_FORMAT = 'FORMAT';

  // FileSystem readyState
  var FS_READY = 'READY';
  var FS_PENDING = 'PENDING';
  var FS_ERROR = 'ERROR';

  function nop() {};

  function hash(string) {
    return Crypto.SHA256(string).toString(Crypto.enc.hex);
  };

  function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, links, version) {
    var now = Date.now();

    this.id = id || hash(guid()),
    this.mode = mode || MODE_FILE;  // node type (file, directory, etc)
    this.size = size || 0; // size (bytes for files, entries for directories)
    this.atime = atime || now; // access time
    this.ctime = ctime || now; // creation time
    this.mtime = mtime || now; // modified time
    this.flags = flags || ''; // file flags
    this.xattrs = xattrs || {}; // extended attributes
    this.links = links || 0; // links count
    this.version = version || 0; // node version
    this.data = hash(id) // id for data object
  };

  function DirectoryEntry(id, type) {
    this.id = id;
    this.type = type || MODE_FILE;
  };

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

  // in: file or directory path
  // out: node structure, or error
  function find_node(objectStore, path, callback) {
    path = Path.normalize(path);
    var name = Path.basename(path);

    if(ROOT_DIRECTORY_NAME == name) {
      function check_root_directory_node(error, rootDirectoryNode) {
        if(error) {
          callback(error);
        } else if(!rootDirectoryNode) {
          callback(new Error('ENOENT'));
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
          callback(new Error('ENOTDIR'));
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
            callback(new Error('ENOENT'));
          } else {
            var nodeId = parentDirectoryData[name].id;
            read_object(objectStore, nodeId, callback);
          }
        }
      };

      var parentPath = Path.dirname(path);
      find_node(objectStore, parentPath, read_parent_directory_data);
    }
  };

  function make_root_directory(objectStore, callback) {
    var directoryNode;
    var directoryData;

    function write_directory_node(error, existingNode) {
      if(!error && existingNode) {
        callback(new Error('EEXIST'));
      } else if(error && 'ENOENT' != error.message) {
        callback(error);
      } else {
        directoryNode = new Node(ROOT_NODE_ID, MODE_DIRECTORY);
        directoryNode.links += 1;
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
  }

  function make_directory(objectStore, path, callback) {
    path = Path.normalize(path);
    var name = Path.basename(path);
    var parentPath = Path.dirname(path);

    var _directoryNode;
    var _directoryData;
    var _parentDirectoryNode;
    var _parentDirectoryData;

    function check_if_directory_exists(error, existingNode) {
      if(!error && existingNode) {
        callback(new Error('EEXIST'));
      } else if(error && 'ENOENT' != error.message) {
        callback(error);
      } else {
        find_node(objectStore, parentPath, read_parent_directory_data);
      }
    }

    function read_parent_directory_data(error, parentDirectoryNode) {
      if(error) {
        callback(error);
      } else {
        _parentDirectoryNode = parentDirectoryNode;
        read_object(objectStore, _parentDirectoryNode.data, write_directory_node);
      }
    };

    function write_directory_node(error, parentDirectoryData) {
      if(error) {
        callback(error);
      } else {
        _parentDirectoryData = parentDirectoryData;
        _directoryNode = new Node(undefined, MODE_DIRECTORY);
        _directoryNode.links += 1;
        write_object(objectStore, _directoryNode, _directoryNode.id, write_directory_data);
      }
    };

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        _directoryData = {};
        write_object(objectStore, _directoryData, _directoryNode.data, update_parent_directory_data);
      }
    };

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        _parentDirectoryData[name] = new DirectoryEntry(_directoryNode.id, MODE_DIRECTORY);
        write_object(objectStore, _parentDirectoryData, _parentDirectoryNode.data, callback);
      }
    }

    find_node(objectStore, path, check_if_directory_exists);
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

    this.readyState = FS_PENDING;
    this.db = null;
  };
  FileSystem.prototype.open = function open(path, flags, mode) {

  };
  FileSystem.prototype.opendir = function opendir(path) {

  };
  FileSystem.prototype.mkdir = function mkdir(path) {
    var deferred = when.defer();
    var transaction = this.db.transaction([FILE_STORE_NAME], IDB_RW);
    var files = transaction.objectStore(FILE_STORE_NAME);

    function check_result(error) {
      if(error) {
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    };

    make_directory(files, path, check_result);
    return deferred.promise();
  };
  FileSystem.prototype.rmdir = function rmdir(path) {

  };
  FileSystem.prototype.stat = function stat(path) {

  };
  FileSystem.prototype.link = function link(oldpath, newpath) {

  };
  FileSystem.prototype.unlink = function unlink(path) {

  };
  FileSystem.prototype.getxattr = function getxattr(path, name) {

  };
  FileSystem.prototype.setxattr = function setxattr(path, name, value) {

  };

  return {
    FileSystem: FileSystem,
  };

});