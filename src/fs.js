define(function(require) {

  var _ = require('nodash');

  // TextEncoder and TextDecoder will either already be present, or use this shim.
  // Because of the way the spec is defined, we need to get them off the global.
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
  var ELoop = require('src/error').ELoop;
  var EFileSystemError = require('src/error').EFileSystemError;

  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FS_FORMAT = require('src/constants').FS_FORMAT;
  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var MODE_SYMBOLIC_LINK = require('src/constants').MODE_SYMBOLIC_LINK;
  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var ROOT_NODE_ID = require('src/constants').ROOT_NODE_ID;
  var SYMLOOP_MAX = require('src/constants').SYMLOOP_MAX;
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

  var providers = require('src/providers/providers');
  var adapters = require('src/adapters/adapters');

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
  function find_node(context, path, callback) {
    path = normalize(path);
    if(!path) {
      return callback(new ENoEntry('path is an empty string'));
    }
    var name = basename(path);
    var parentPath = dirname(path);
    var followedCount = 0;

    function check_root_directory_node(error, rootDirectoryNode) {
      if(error) {
        callback(error);
      } else if(!rootDirectoryNode) {
        callback(new ENoEntry('path does not exist'));
      } else {
        callback(null, rootDirectoryNode);
      }
    }

    // in: parent directory node
    // out: parent directory data
    function read_parent_directory_data(error, parentDirectoryNode) {
      if(error) {
        callback(error);
      } else if(parentDirectoryNode.mode !== MODE_DIRECTORY || !parentDirectoryNode.data) {
        callback(new ENotDirectory('a component of the path prefix is not a directory'));
      } else {
        context.get(parentDirectoryNode.data, get_node_from_parent_directory_data);
      }
    }

    // in: parent directory data
    // out: searched node
    function get_node_from_parent_directory_data(error, parentDirectoryData) {
      if(error) {
        callback(error);
      } else {
        if(!_(parentDirectoryData).has(name)) {
          callback(new ENoEntry('path does not exist'));
        } else {
          var nodeId = parentDirectoryData[name].id;
          context.get(nodeId, is_symbolic_link);
        }
      }
    }

    function is_symbolic_link(error, node) {
      if(error) {
        callback(error);
      } else {
        if(node.mode == MODE_SYMBOLIC_LINK) {
          followedCount++;
          if(followedCount > SYMLOOP_MAX){
            callback(new ELoop('too many symbolic links were encountered'));
          } else {
            follow_symbolic_link(node.data);
          }
        } else {
          callback(null, node);
        }
      }
    }

    function follow_symbolic_link(data) {
      data = normalize(data);
      parentPath = dirname(data);
      name = basename(data);
      if(ROOT_DIRECTORY_NAME == name) {
        context.get(ROOT_NODE_ID, check_root_directory_node);
      } else {
        find_node(context, parentPath, read_parent_directory_data);
      }
    }

    if(ROOT_DIRECTORY_NAME == name) {
      context.get(ROOT_NODE_ID, check_root_directory_node);
    } else {
      find_node(context, parentPath, read_parent_directory_data);
    }
  }

  /*
   * make_root_directory
   */

  // Note: this should only be invoked when formatting a new file system
  function make_root_directory(context, callback) {
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
        context.put(directoryNode.id, directoryNode, write_directory_data);
      }
    }

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        context.put(directoryNode.data, directoryData, callback);
      }
    }

    find_node(context, ROOT_DIRECTORY_NAME, write_directory_node);
  }

  /*
   * make_directory
   */

  function make_directory(context, path, callback) {
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
        find_node(context, parentPath, read_parent_directory_data);
      }
    }

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        context.get(parentDirectoryNode.data, write_directory_node);
      }
    }

    function write_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        directoryNode = new Node(undefined, MODE_DIRECTORY);
        directoryNode.nlinks += 1;
        context.put(directoryNode.id, directoryNode, write_directory_data);
      }
    }

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        context.put(directoryNode.data, directoryData, update_parent_directory_data);
      }
    }

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
        context.put(parentDirectoryNode.data, parentDirectoryData, callback);
      }
    }

    find_node(context, path, check_if_directory_exists);
  }

  /*
   * remove_directory
   */

  function remove_directory(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        context.get(parentDirectoryNode.data, check_if_node_exists);
      }
    }

    function check_if_node_exists(error, result) {
      if(error) {
        callback(error);
      } else if(ROOT_DIRECTORY_NAME == name) {
        callback(new EBusy());
      } else if(!_(result).has(name)) {
        callback(new ENoEntry());
      } else {
        parentDirectoryData = result;
        directoryNode = parentDirectoryData[name].id;
        context.get(directoryNode, check_if_node_is_directory);
      }
    }

    function check_if_node_is_directory(error, result) {
      if(error) {
        callback(error);
      } else if(result.mode != MODE_DIRECTORY) {
        callback(new ENotDirectory());
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_directory_is_empty);
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
          remove_directory_entry_from_parent_directory_node();
        }
      }
    }

    function remove_directory_entry_from_parent_directory_node() {
      delete parentDirectoryData[name];
      context.put(parentDirectoryNode.data, parentDirectoryData, remove_directory_node);
    }

    function remove_directory_node(error) {
      if(error) {
        callback(error);
      } else {
        context.delete(directoryNode.id, remove_directory_data);
      }
    }

    function remove_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        context.delete(directoryNode.data, callback);
      }
    }

    find_node(context, parentPath, read_parent_directory_data);
  }

  function open_file(context, path, flags, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var directoryEntry;
    var fileNode;
    var fileData;

    var followedCount = 0;

    if(ROOT_DIRECTORY_NAME == name) {
      if(_(flags).contains(O_WRITE)) {
        callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
      } else {
        find_node(context, path, set_file_node);
      }
    } else {
      find_node(context, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
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
              context.get(directoryEntry.id, check_if_symbolic_link);
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

    function check_if_symbolic_link(error, result) {
      if(error) {
        callback(error);
      } else {
        var node = result;
        if(node.mode == MODE_SYMBOLIC_LINK) {
          followedCount++;
          if(followedCount > SYMLOOP_MAX){
            callback(new ELoop('too many symbolic links were encountered'));
          } else {
            follow_symbolic_link(node.data);
          }
        } else {
          set_file_node(undefined, node);
        }
      }
    }

    function follow_symbolic_link(data) {
      data = normalize(data);
      parentPath = dirname(data);
      name = basename(data);
      if(ROOT_DIRECTORY_NAME == name) {
        if(_(flags).contains(O_WRITE)) {
          callback(new EIsDirectory('the named file is a directory and O_WRITE is set'));
        } else {
          find_node(context, path, set_file_node);
        }
      }
      find_node(context, parentPath, read_directory_data);
    }

    function set_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        callback(null, fileNode);
      }
    }

    function write_file_node() {
      fileNode = new Node(undefined, MODE_FILE);
      fileNode.nlinks += 1;
      context.put(fileNode.id, fileNode, write_file_data);
    }

    function write_file_data(error) {
      if(error) {
        callback(error);
      } else {
        fileData = new Uint8Array(0);
        context.put(fileNode.data, fileData, update_directory_data);
      }
    }

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_FILE);
        context.put(directoryNode.data, directoryData, handle_update_result);
      }
    }

    function handle_update_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, fileNode);
      }
    }
  }

  function write_data(context, ofd, buffer, offset, length, position, callback) {
    var fileNode;
    var fileData;

    function return_nbytes(error) {
      if(error) {
        callback(error);
      } else {
        callback(null, length);
      }
    }

    function update_file_node(error) {
      if(error) {
        callback(error);
      } else {
        context.put(fileNode.id, fileNode, return_nbytes);
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

        context.put(fileNode.data, newData, update_file_node);
      }
    }

    function read_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        context.get(fileNode.data, update_file_data);
      }
    }

    context.get(ofd.id, read_file_data);
  }

  function read_data(context, ofd, buffer, offset, length, position, callback) {
    var fileNode;
    var fileData;

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
        callback(null, length);
      }
    }

    function read_file_data(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        context.get(fileNode.data, handle_file_data);
      }
    }

    context.get(ofd.id, read_file_data);
  }

  function stat_file(context, path, callback) {
    path = normalize(path);
    var name = basename(path);

    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }

    find_node(context, path, check_file);
  }

  function fstat_file(context, ofd, callback) {
    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }

    context.get(ofd.id, check_file);
  }

  function lstat_file(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;

    if(ROOT_DIRECTORY_NAME == name) {
      context.get(ROOT_NODE_ID, check_file);
    } else {
      find_node(context, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
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
          context.get(directoryData[name].id, check_file);
        }
      }
    }

    function check_file(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }
  }

  function link_node(context, oldpath, newpath, callback) {
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

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks += 1;
        context.put(fileNode.id, fileNode, callback);
      }
    }

    function read_directory_entry(error, result) {
      if(error) {
        callback(error);
      } else {
        context.get(newDirectoryData[newname].id, update_file_node);
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
          context.put(newDirectoryNode.data, newDirectoryData, read_directory_entry);
        }
      }
    }

    function read_new_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        newDirectoryNode = result;
        context.get(newDirectoryNode.data, check_if_new_file_exists);
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
          find_node(context, newParentPath, read_new_directory_data);
        }
      }
    }

    function read_old_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        oldDirectoryNode = result;
        context.get(oldDirectoryNode.data, check_if_old_file_exists);
      }
    }

    find_node(context, oldParentPath, read_old_directory_data);
  }

  function unlink_node(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var fileNode;

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        delete directoryData[name];
        context.put(directoryNode.data, directoryData, callback);
      }
    }

    function delete_file_data(error) {
      if(error) {
        callback(error);
      } else {
        context.delete(fileNode.data, update_directory_data);
      }
    }

    function update_file_node(error, result) {
      if(error) {
        callback(error);
      } else {
        fileNode = result;
        fileNode.nlinks -= 1;
        if(fileNode.nlinks < 1) {
          context.delete(fileNode.id, delete_file_data);
        } else {
          context.put(fileNode.id, fileNode, update_directory_data);
        }
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
          context.get(directoryData[name].id, update_file_node);
        }
      }
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    find_node(context, parentPath, read_directory_data);
  }

  function read_directory(context, path, callback) {
    path = normalize(path);
    var name = basename(path);

    var directoryNode;
    var directoryData;

    function handle_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        var files = Object.keys(directoryData);
        callback(null, files);
      }
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, handle_directory_data);
      }
    }

    find_node(context, path, read_directory_data);
  }

  function make_symbolic_link(context, srcpath, dstpath, callback) {
    dstpath = normalize(dstpath);
    var name = basename(dstpath);
    var parentPath = dirname(dstpath);

    var directoryNode;
    var directoryData;
    var fileNode;

    if(ROOT_DIRECTORY_NAME == name) {
      callback(new EExists('the destination path already exists'));
    } else {
      find_node(context, parentPath, read_directory_data);
    }

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
      }
    }

    function check_if_file_exists(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).has(name)) {
          callback(new EExists('the destination path already exists'));
        } else {
          write_file_node();
        }
      }
    }

    function write_file_node() {
      fileNode = new Node(undefined, MODE_SYMBOLIC_LINK);
      fileNode.nlinks += 1;
      fileNode.size = srcpath.length;
      fileNode.data = srcpath;
      context.put(fileNode.id, fileNode, update_directory_data);
    }

    function update_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData[name] = new DirectoryEntry(fileNode.id, MODE_SYMBOLIC_LINK);
        context.put(directoryNode.data, directoryData, callback);
      }
    }
  }

  function read_link(context, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;

    find_node(context, parentPath, read_directory_data);

    function read_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryNode = result;
        context.get(directoryNode.data, check_if_file_exists);
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
          context.get(directoryData[name].id, check_if_symbolic);
        }
      }
    }

    function check_if_symbolic(error, result) {
      if(error) {
        callback(error);
      } else {
        if(result.mode != MODE_SYMBOLIC_LINK) {
          callback(new EInvalid("path not a symbolic link"));
        } else {
          callback(null, result.data);
        }
      }
    }
  }

  function truncate_file(context, path, length, callback) {
    path = normalize(path);

    var fileNode;

    function read_file_data (error, node) {
      if (error) {
        callback(error);
      } else if(node.mode == MODE_DIRECTORY ) {
        callback(new EIsDirectory('the named file is a directory'));
      } else{
        fileNode = node;
        context.get(fileNode.data, truncate_file_data);
      }
    }

    function truncate_file_data(error, fileData) {
      if (error) {
        callback(error);
      } else {
        var data = new Uint8Array(length);
        if(fileData) {
          data.set(fileData.subarray(0, length));
        }
        context.put(fileNode.data, data, update_file_node);
      }
    }

    function update_file_node (error) {
      if(error) {
        callback(error);
      } else {
        fileNode.size = length;
        fileNode.mtime = Date.now();
        fileNode.version += 1;
        context.put(fileNode.id, fileNode, callback);
      }
    }

    if(length < 0) {
      callback(new EInvalid('length cannot be negative'));
    } else {
      find_node(context, path, read_file_data);
    }
  }

  function ftruncate_file(context, ofd, length, callback) {
    var fileNode;

    function read_file_data (error, node) {
      if (error) {
        callback(error);
      } else if(node.mode == MODE_DIRECTORY ) {
        callback(new EIsDirectory('the named file is a directory'));
      } else{
        fileNode = node;
        context.get(fileNode.data, truncate_file_data);
      }
    }

    function truncate_file_data(error, fileData) {
      if (error) {
        callback(error);
      } else {
        var data = new Uint8Array(length);
        if(fileData) {
          data.set(fileData.subarray(0, length));
        }
        context.put(fileNode.data, data, update_file_node);
      }
    }

    function update_file_node (error) {
      if(error) {
        callback(error);
      } else {
        fileNode.size = length;
        fileNode.mtime = Date.now();
        fileNode.version += 1;
        context.put(fileNode.id, fileNode, callback);
      }
    }

    if(length < 0) {
      callback(new EInvalid('length cannot be negative'));
    } else {
      context.get(ofd.id, read_file_data);
    }
  }

  //NOTE: utimes does follow symoblic links (safe to use find_node)
  function utimes_file(context, path, atime, mtime, callback) {
    path = normalize(path);

    function update_times (error, node) {
      //Note: Going by node.js' implementation, utimes works on directories
      if (error) {
        callback(error);
      }
      else {
        console.log(node);
        node.atime = atime;
        node.mtime = mtime;
        console.log('updated times atime=' + node.atime + 'and mtime=' + node.mtime);

        _stat (context, 'test', path, function (error, stat) {
          if (error) console.log('error');
          else console.log(stat);
        });
        // callback(null);
        context.put(node.id, node, callback);
      }
    }

    //check if atime and mtime are integers and >= 0
    if (typeof atime != 'number' || typeof mtime != 'number') {
      callback(new EInvalid('Invalid DateTime values'));
    }
    else if (atime < 0 || mtime < 0) {
      callback(new EInvalid('DateTime values cannot be negative'));
    }
    else {
      find_node(context, path, update_times);
    }
  }

  function futimes_file(context, ofd, atime, mtime, callback) {

    function update_times (error, node) {
      if (error) {
        callback(error);
      }
      else {
        node.atime = atime;
        node.mtime = mtime;
        context.put(node.id, node, callback);
      }
    }

    //check if atime and mtime are integers and >= 0
    if (typeof atime != 'number' || typeof mtime == 'number') {
      callback(new EInvalid('Invalid DateTime values'));
    }
    else if (atime < 0 || mtime < 0) {
      callback(new EInvalid('DateTime values cannot be negative'));
    }
    else {
      context.get(ofd.id, path, update_times);
    }
  }

  function validate_flags(flags) {
    if(!_(O_FLAGS).has(flags)) {
      return null;
    }
    return O_FLAGS[flags];
  }

  // nullCheck from https://github.com/joyent/node/blob/master/lib/fs.js
  function nullCheck(path, callback) {
    if (('' + path).indexOf('\u0000') !== -1) {
      var er = new Error('Path must be a string without null bytes.');
      callback(er);
      return false;
    }
    return true;
  }

  // node.js supports a calling pattern that leaves off a callback.
  function maybeCallback(callback) {
    if(typeof callback === "function") {
      return callback;
    }
    return function(err) {
      if(err) {
        throw err;
      }
    };
  }


  /*
   * FileSystem
   *
   * A FileSystem takes an `options` object, which can specify a number of,
   * options.  All options are optional, and include:
   *
   * name: the name of the file system, defaults to "local"
   *
   * flags: one or more flags to use when creating/opening the file system.
   *        For example: "FORMAT" will cause the file system to be formatted.
   *        No explicit flags are set by default.
   *
   * provider: an explicit storage provider to use for the file
   *           system's database context provider.  A number of context
   *           providers are included (see /src/providers), and users
   *           can write one of their own and pass it in to be used.
   *           By default an IndexedDB provider is used.
   *
   * callback: a callback function to be executed when the file system becomes
   *           ready for use. Depending on the context provider used, this might
   *           be right away, or could take some time. The callback should expect
   *           an `error` argument, which will be null if everything worked.  Also
   *           users should check the file system's `readyState` and `error`
   *           properties to make sure it is usable.
   */
  function FileSystem(options, callback) {
    options = options || {};
    callback = callback || nop;

    var name = options.name || FILE_SYSTEM_NAME;
    var flags = options.flags;
    var provider = options.provider || new providers.Default(name);
    var forceFormatting = _(flags).contains(FS_FORMAT);

    var fs = this;
    fs.readyState = FS_PENDING;
    fs.name = name;
    fs.error = null;

    // Safely expose the list of open files and file
    // descriptor management functions
    var openFiles = {};
    var nextDescriptor = 1;
    Object.defineProperty(this, "openFiles", {
      get: function() { return openFiles; }
    });
    this.allocDescriptor = function(openFileDescription) {
      var fd = nextDescriptor ++;
      openFiles[fd] = openFileDescription;
      return fd;
    };
    this.releaseDescriptor = function(fd) {
      delete openFiles[fd];
    };

    // Safely expose the operation queue
    var queue = [];
    this.queueOrRun = function(operation) {
      var error;

      if(FS_READY == fs.readyState) {
        operation.call(fs);
      } else if(FS_ERROR == fs.readyState) {
        error = new EFileSystemError('unknown error');
      } else {
        queue.push(operation);
      }

      return error;
    };
    function runQueued() {
      queue.forEach(function(operation) {
        operation.call(this);
      }.bind(fs));
      queue = null;
    }

    // Open file system storage provider
    provider.open(function(err, needsFormatting) {
      function complete(error) {
        fs.provider = provider;
        if(error) {
          fs.readyState = FS_ERROR;
        } else {
          fs.readyState = FS_READY;
          runQueued();
        }
        callback(error);
      }

      if(err) {
        return complete(err);
      }

      // If we don't need or want formatting, we're done
      if(!(forceFormatting || needsFormatting)) {
        return complete(null);
      }
      // otherwise format the fs first
      var context = provider.getReadWriteContext();
      context.clear(function(err) {
        if(err) {
          complete(err);
          return;
        }
        make_root_directory(context, complete);
      });
    });
  }

  // Expose storage providers on FileSystem constructor
  FileSystem.providers = providers;

  // Expose adatpers on FileSystem constructor
  FileSystem.adapters = adapters;

  function _open(fs, context, path, flags, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, fileNode) {
      if(error) {
        callback(error);
      } else {
        var position;
        if(_(flags).contains(O_APPEND)) {
          position = fileNode.size;
        } else {
          position = 0;
        }
        var openFileDescription = new OpenFileDescription(fileNode.id, flags, position);
        var fd = fs.allocDescriptor(openFileDescription);
        callback(null, fd);
      }
    }

    flags = validate_flags(flags);
    if(!flags) {
      callback(new EInvalid('flags is not valid'));
    }

    open_file(context, path, flags, check_result);
  }

  function _close(fs, fd, callback) {
    if(!_(fs.openFiles).has(fd)) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      fs.releaseDescriptor(fd);
      callback(null);
    }
  }

  function _mkdir(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    make_directory(context, path, check_result);
  }

  function _rmdir(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    remove_directory(context, path, check_result);
  }

  function _stat(context, name, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, name);
        callback(null, stats);
      }
    }

    stat_file(context, path, check_result);
  }

  function _fstat(fs, context, fd, callback) {
    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, fs.name);
        callback(null, stats);
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else {
      fstat_file(context, ofd, check_result);
    }
  }

  function _link(context, oldpath, newpath, callback) {
    if(!nullCheck(oldpath, callback)) return;
    if(!nullCheck(newpath, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    link_node(context, oldpath, newpath, check_result);
  }

  function _unlink(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    unlink_node(context, path, check_result);
  }

  function _read(fs, context, fd, buffer, offset, length, position, callback) {
    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        callback(error);
      } else {
        callback(null, nbytes);
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_READ)) {
      callback(new EBadFileDescriptor('descriptor does not permit reading'));
    } else {
      read_data(context, ofd, buffer, offset, length, position, check_result);
    }
  }

  function _readFile(fs, context, path, options, callback) {
    if(!options) {
      options = { encoding: null, flag: 'r' };
    } else if(typeof options === "function") {
      options = { encoding: null, flag: 'r' };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: 'r' };
    }

    if(!nullCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'r');
    if(!flags) {
      callback(new EInvalid('flags is not valid'));
    }

    open_file(context, path, flags, function(err, fileNode) {
      if(err) {
        return callback(err);
      }
      var ofd = new OpenFileDescription(fileNode.id, flags, 0);
      var fd = fs.allocDescriptor(ofd);

      fstat_file(context, ofd, function(err2, fstatResult) {
        if(err2) {
          return callback(err2);
        }

        var stats = new Stats(fstatResult, fs.name);
        var size = stats.size;
        var buffer = new Uint8Array(size);

        read_data(context, ofd, buffer, 0, size, 0, function(err3, nbytes) {
          if(err3) {
            return callback(err3);
          }
          fs.releaseDescriptor(fd);

          var data;
          if(options.encoding === 'utf8') {
            data = new TextDecoder('utf-8').decode(buffer);
          } else {
            data = buffer;
          }
          callback(null, data);
        });
      });

    });
  }

  function _write(fs, context, fd, buffer, offset, length, position, callback) {
    offset = (undefined === offset) ? 0 : offset;
    length = (undefined === length) ? buffer.length - offset : length;

    function check_result(error, nbytes) {
      if(error) {
        callback(error);
      } else {
        callback(null, nbytes);
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new EBadFileDescriptor('descriptor does not permit writing'));
    } else if(buffer.length - offset < length) {
      callback(new EIO('intput buffer is too small'));
    } else {
      write_data(context, ofd, buffer, offset, length, position, check_result);
    }
  }

  function _writeFile(fs, context, path, data, options, callback) {
    if(!options) {
      options = { encoding: 'utf8', flag: 'w' };
    } else if(typeof options === "function") {
      options = { encoding: 'utf8', flag: 'w' };
    } else if(typeof options === "string") {
      options = { encoding: options, flag: 'w' };
    }

    if(!nullCheck(path, callback)) return;

    var flags = validate_flags(options.flag || 'w');
    if(!flags) {
      callback(new EInvalid('flags is not valid'));
    }

    data = data || '';
    if(typeof data === "number") {
      data = '' + data;
    }
    if(typeof data === "string" && options.encoding === 'utf8') {
      data = new TextEncoder('utf-8').encode(data);
    }

    open_file(context, path, flags, function(err, fileNode) {
      if(err) {
        return callback(err);
      }
      var ofd = new OpenFileDescription(fileNode.id, flags, 0);
      var fd = fs.allocDescriptor(ofd);

      write_data(context, ofd, data, 0, data.length, 0, function(err2, nbytes) {
        if(err2) {
          return callback(err2);
        }
        fs.releaseDescriptor(fd);
        callback(null);
      });
    });
  }

  function _getxattr(path, name, callback) {
    // TODO
    //     if(!nullCheck(path, callback)) return;
  }

  function _setxattr(path, name, value, callback) {
    // TODO
    //    if(!nullCheck(path, callback)) return;
  }

  function _lseek(fs, context, fd, offset, whence, callback) {
    function check_result(error, offset) {
      if(error) {
        callback(error);
      } else {
        callback(offset);
      }
    }

    function update_descriptor_position(error, stats) {
      if(error) {
        callback(error);
      } else {
        if(stats.size + offset < 0) {
          callback(new EInvalid('resulting file offset would be negative'));
        } else {
          ofd.position = stats.size + offset;
          callback(null, ofd.position);
        }
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    }

    if('SET' === whence) {
      if(offset < 0) {
        callback(new EInvalid('resulting file offset would be negative'));
      } else {
        ofd.position = offset;
        callback(null, ofd.position);
      }
    } else if('CUR' === whence) {
      if(ofd.position + offset < 0) {
        callback(new EInvalid('resulting file offset would be negative'));
      } else {
        ofd.position += offset;
        callback(null, ofd.position);
      }
    } else if('END' === whence) {
      fstat_file(context, ofd, update_descriptor_position);
    } else {
      callback(new EInvalid('whence argument is not a proper value'));
    }
  }

  function _readdir(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, files) {
      if(error) {
        callback(error);
      } else {
        callback(null, files);
      }
    }

    read_directory(context, path, check_result);
  }

  function _utimes(context, path, atime, mtime, callback) {
    if(!nullCheck(path, callback)) return;

    //set atime or mtime to the current time if they are null
    atime = (atime) ? atime : Date.now();
    mtime = (mtime) ? mtime : Date.now();

    function check_result(error) {
      if (error) {
        callback(error);
      }
      else {
        callback(null);
      }
    }    
    utimes_file(context, path, atime, mtime, check_result)
  }

  function _futimes(context, fd, atime, mtime, callback) {
    function check_result(error) {
      if (error) {
        callback(error);
      }
      else {
        callback(null);
      }
    }

    //set atime or mtime to the current time if they are null
    atime = (atime) ? atime : Date.now();
    mtime = (mtime) ? mtime : Date.now();

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new EBadFileDescriptor('descriptor does not permit writing'));
    } else {
      futimes_file(context, ofd, atime, mtime, check_result);
    }    
  }

  function _rename(context, oldpath, newpath, callback) {
    if(!nullCheck(oldpath, callback)) return;
    if(!nullCheck(newpath, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    function unlink_old_node(error) {
      if(error) {
        callback(error);
      } else {
        unlink_node(context, oldpath, check_result);
      }
    }

    link_node(context, oldpath, newpath, unlink_old_node);
  }

  function _symlink(context, srcpath, dstpath, callback) {
    if(!nullCheck(srcpath, callback)) return;
    if(!nullCheck(dstpath, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    make_symbolic_link(context, srcpath, dstpath, check_result);
  }

  function _readlink(context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        callback(null, result);
      }
    }

    read_link(context, path, check_result);
  }

  function _realpath(fd, length, callback) {
    // TODO
  }

  function _lstat(fs, context, path, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error, result) {
      if(error) {
        callback(error);
      } else {
        var stats = new Stats(result, fs.name);
        callback(null, stats);
      }
    }

    lstat_file(context, path, check_result);
  }

  function _truncate(context, path, length, callback) {
    if(!nullCheck(path, callback)) return;

    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    truncate_file(context, path, length, check_result);
  }

  function _ftruncate(fs, context, fd, length, callback) {
    function check_result(error) {
      if(error) {
        callback(error);
      } else {
        callback(null);
      }
    }

    var ofd = fs.openFiles[fd];

    if(!ofd) {
      callback(new EBadFileDescriptor('invalid file descriptor'));
    } else if(!_(ofd.flags).contains(O_WRITE)) {
      callback(new EBadFileDescriptor('descriptor does not permit writing'));
    } else {
      ftruncate_file(context, ofd, length, check_result);
    }
  }


  /**
   * Public API for FileSystem
   */

  FileSystem.prototype.open = function(path, flags, mode, callback) {
    // We support the same signature as node with a `mode` arg, but
    // ignore it. Find the callback.
    callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _open(fs, context, path, flags, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.close = function(fd, callback) {
    _close(this, fd, maybeCallback(callback));
  };
  FileSystem.prototype.mkdir = function(path, mode, callback) {
    // Support passing a mode arg, but we ignore it internally for now.
    if(typeof mode === 'function') {
      callback = mode;
    }
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _mkdir(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.rmdir = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _rmdir(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.stat = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _stat(context, fs.name, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.fstat = function(fd, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _fstat(fs, context, fd, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.link = function(oldpath, newpath, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _link(context, oldpath, newpath, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.unlink = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _unlink(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.read = function(fd, buffer, offset, length, position, callback) {
    // Follow how node.js does this
    callback = maybeCallback(callback);
    function wrapper(err, bytesRead) {
      // Retain a reference to buffer so that it can't be GC'ed too soon.
      callback(err, bytesRead || 0, buffer);
    }
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _read(fs, context, fd, buffer, offset, length, position, wrapper);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readFile = function(path, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _readFile(fs, context, path, options, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.write = function(fd, buffer, offset, length, position, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _write(fs, context, fd, buffer, offset, length, position, callback);
      }
    );

    if(error) callback(error);
  };
  FileSystem.prototype.writeFile = function(path, data, options, callback_) {
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _writeFile(fs, context, path, data, options, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.lseek = function(fd, offset, whence, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _lseek(fs, context, fd, offset, whence, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readdir = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _readdir(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.rename = function(oldpath, newpath, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _rename(context, oldpath, newpath, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.readlink = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _readlink(context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.symlink = function(srcpath, dstpath, type, callback_) {
    // Follow node.js in allowing the `type` arg to be passed, but we ignore it.
    var callback = maybeCallback(arguments[arguments.length - 1]);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _symlink(context, srcpath, dstpath, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.lstat = function(path, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _lstat(fs, context, path, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.truncate = function(path, length, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _truncate(context, path, length, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.ftruncate = function(fd, length, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function() {
        var context = fs.provider.getReadWriteContext();
        _ftruncate(fs, context, fd, length, callback);
      }
    );
    if(error) callback(error);
  };
  FileSystem.prototype.utimes = function(path, atime, mtime, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.getReadWriteContext();
        _utimes(context, path, atime, mtime, callback);
      }
    );
  };
  FileSystem.prototype.futimes = function(fd, atime, mtime, callback) {
    callback = maybeCallback(callback);
    var fs = this;
    var error = fs.queueOrRun(
      function () {
        var context = fs.provider.getReadWriteContext();
        _futimes(context, fd, atime, mtime, callback);
      }
    );
  };

  return {
    FileSystem: FileSystem,
    Path: require('src/path')
  };

});
