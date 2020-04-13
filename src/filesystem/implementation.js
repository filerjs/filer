var Path = require('../path.js');
var normalize = Path.normalize;
var dirname = Path.dirname;
var basename = Path.basename;
var isAbsolutePath = Path.isAbsolute;
var shared = require('../shared.js');

var Constants = require('../constants.js');
var NODE_TYPE_FILE = Constants.NODE_TYPE_FILE;
var NODE_TYPE_DIRECTORY = Constants.NODE_TYPE_DIRECTORY;
var NODE_TYPE_SYMBOLIC_LINK = Constants.NODE_TYPE_SYMBOLIC_LINK;
var NODE_TYPE_META = Constants.NODE_TYPE_META;

var FULL_READ_WRITE_EXEC_PERMISSIONS = Constants.FULL_READ_WRITE_EXEC_PERMISSIONS;

var ROOT_DIRECTORY_NAME = Constants.ROOT_DIRECTORY_NAME;
var SUPER_NODE_ID = Constants.SUPER_NODE_ID;
var SYMLOOP_MAX = Constants.SYMLOOP_MAX;

var O_READ = Constants.O_READ;
var O_WRITE = Constants.O_WRITE;
var O_CREATE = Constants.O_CREATE;
var O_EXCLUSIVE = Constants.O_EXCLUSIVE;
var O_APPEND = Constants.O_APPEND;
var O_FLAGS = Constants.O_FLAGS;

var XATTR_CREATE = Constants.XATTR_CREATE;
var XATTR_REPLACE = Constants.XATTR_REPLACE;
var FS_NOMTIME = Constants.FS_NOMTIME;
var FS_NOCTIME = Constants.FS_NOCTIME;

var Errors = require('../errors.js');
var DirectoryEntry = require('../directory-entry.js');
var openFiles = require('../open-files.js');
var OpenFileDescription = require('../open-file-description.js');
var SuperNode = require('../super-node.js');
var Node = require('../node.js');
var Stats = require('../stats.js');

/**
 * Update node times. Only passed times are modified (undefined times are ignored)
 * and filesystem flags are examined in order to override update logic.
 */
function update_node_times(context, path, node, times, callback) {
  // Honour mount flags for how we update times
  var flags = context.flags;
  if(flags.includes(FS_NOCTIME)) {
    delete times.ctime;
  }
  if(flags.includes(FS_NOMTIME)) {
    delete times.mtime;
  }

  // Only do the update if required (i.e., times are still present)
  var update = false;
  if(times.ctime) {
    node.ctime = times.ctime;
    // We don't do atime tracking for perf reasons, but do mirror ctime
    node.atime = times.ctime;
    update = true;
  }
  if(times.atime) {
    // The only time we explicitly pass atime is when utimes(), futimes() is called.
    // Override ctime mirror here if so
    node.atime = times.atime;
    update = true;
  }
  if(times.mtime) {
    node.mtime = times.mtime;
    update = true;
  }

  function complete(error) {
    // Queue this change so we can send watch events.
    // Unlike node.js, we send the full path vs. basename/dirname only.
    context.changes.push({ event: 'change', path: path });
    callback(error);
  }

  if(update) {
    context.putObject(node.id, node, complete);
  } else {
    complete();
  }
}

/**
 * make_node()
 */
// in: file or directory path
// out: new node representing file/directory
function make_node(context, path, type, callback) {
  if(type !== NODE_TYPE_DIRECTORY && type !== NODE_TYPE_FILE) {
    return callback(new Errors.EINVAL('type must be a directory or file', path));
  }

  path = normalize(path);

  var name = basename(path);
  var parentPath = dirname(path);
  var parentNode;
  var parentNodeData;
  var node;

  // Check if the parent node exists
  function create_node_in_parent(error, parentDirectoryNode) {
    if(error) {
      callback(error);
    } else if(parentDirectoryNode.type !== NODE_TYPE_DIRECTORY) {
      callback(new Errors.ENOTDIR('a component of the path prefix is not a directory', path));
    } else {
      parentNode = parentDirectoryNode;
      find_node(context, path, check_if_node_exists);
    }
  }

  // Check if the node to be created already exists
  function check_if_node_exists(error, result) {
    if(!error && result) {
      callback(new Errors.EEXIST('path name already exists', path));
    } else if(error && !(error instanceof Errors.ENOENT)) {
      callback(error);
    } else {
      context.getObject(parentNode.data, create_node);
    }
  }

  // Create the new node
  function create_node(error, result) {
    if(error) {
      callback(error);
    } else {
      parentNodeData = result;
      Node.create({
        guid: context.guid,
        type: type
      }, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        node = result;
        node.nlinks += 1;
        context.putObject(node.id, node, update_parent_node_data);
      });
    }
  }

  // Update parent node time
  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, parentPath, node, { mtime: now, ctime: now }, callback);
    }
  }

  // Update the parent nodes data
  function update_parent_node_data(error) {
    if(error) {
      callback(error);
    } else {
      parentNodeData[name] = new DirectoryEntry(node.id, type);
      context.putObject(parentNode.data, parentNodeData, update_time);
    }
  }

  // Find the parent node
  find_node(context, parentPath, create_node_in_parent);
}

/**
 * find_node
 */
// in: file or directory path
// out: node structure, or error
function find_node(context, path, callback) {
  path = normalize(path);
  if(!path) {
    return callback(new Errors.ENOENT('path is an empty string'));
  }
  var name = basename(path);
  var parentPath = dirname(path);
  var followedCount = 0;

  function read_root_directory_node(error, nodeData) {
    if(error) {
      return callback(error);
    }

    // Parse existing node as SuperNode
    const superNode = new SuperNode(nodeData);

    if(!superNode || superNode.type !== NODE_TYPE_META || !superNode.rnode) {
      callback(new Errors.EFILESYSTEMERROR());
    } else {
      context.getObject(superNode.rnode, check_root_directory_node);
    }
  }

  function check_root_directory_node(error, rootDirectoryNode) {
    if(error) {
      callback(error);
    } else if(!rootDirectoryNode) {
      callback(new Errors.ENOENT());
    } else {
      Node.create(rootDirectoryNode, callback);
    }
  }

  // in: parent directory node
  // out: parent directory data
  function read_parent_directory_data(error, parentDirectoryNode) {
    if(error) {
      callback(error);
    } else if(parentDirectoryNode.type !== NODE_TYPE_DIRECTORY || !parentDirectoryNode.data) {
      callback(new Errors.ENOTDIR('a component of the path prefix is not a directory', path));
    } else {
      context.getObject(parentDirectoryNode.data, get_node_from_parent_directory_data);
    }
  }

  // in: parent directory data
  // out: searched node
  function get_node_from_parent_directory_data(error, parentDirectoryData) {
    if(error) {
      callback(error);
    } else {
      if(!Object.prototype.hasOwnProperty.call(parentDirectoryData, name)) {
        callback(new Errors.ENOENT(null, path));
      } else {
        var nodeId = parentDirectoryData[name].id;
        context.getObject(nodeId, create_node);
      }
    }
  }

  function create_node(error, data) {
    if(error) {
      return callback(error);
    }
    Node.create(data, is_symbolic_link);
  }

  function is_symbolic_link(error, node) {
    if(error) {
      callback(error);
    } else {
      if(node.type === NODE_TYPE_SYMBOLIC_LINK) {
        followedCount++;
        if(followedCount > SYMLOOP_MAX){
          callback(new Errors.ELOOP(null, path));
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
    if(ROOT_DIRECTORY_NAME === name) {
      context.getObject(SUPER_NODE_ID, read_root_directory_node);
    } else {
      find_node(context, parentPath, read_parent_directory_data);
    }
  }

  if(ROOT_DIRECTORY_NAME === name) {
    context.getObject(SUPER_NODE_ID, read_root_directory_node);
  } else {
    find_node(context, parentPath, read_parent_directory_data);
  }
}


/**
 * set extended attribute (refactor)
 */
function set_extended_attribute (context, path, node, name, value, flag, callback) {
  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      update_node_times(context, path, node, { ctime: Date.now() }, callback);
    }
  }

  var xattrs = node.xattrs;

  if (flag === XATTR_CREATE && Object.prototype.hasOwnProperty.call(xattrs, name)) {
    callback(new Errors.EEXIST('attribute already exists', path));
  }
  else if (flag === XATTR_REPLACE && !Object.prototype.hasOwnProperty.call(xattrs, name)) {
    callback(new Errors.ENOATTR(null, path));
  }
  else {
    xattrs[name] = value;
    context.putObject(node.id, node, update_time);
  }
}

/**
 * ensure_root_directory. Creates a root node if necessary.
 *
 * Note: this should only be invoked when formatting a new file system.
 * Multiple invocations of this by separate instances will still result
 * in only a single super node.
 */
function ensure_root_directory(context, callback) {
  var superNode;
  var directoryNode;
  var directoryData;

  function ensure_super_node(error, existingNode) {
    if(!error && existingNode) {
      // Another instance has beat us and already created the super node.
      callback();
    } else if(error && !(error instanceof Errors.ENOENT)) {
      callback(error);
    } else {
      SuperNode.create({guid: context.guid}, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        superNode = result;
        context.putObject(superNode.id, superNode, write_directory_node);
      });
    }
  }

  function write_directory_node(error) {
    if(error) {
      callback(error);
    } else {
      Node.create({
        guid: context.guid,
        id: superNode.rnode,
        type: NODE_TYPE_DIRECTORY
      }, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        directoryNode = result;
        directoryNode.nlinks += 1;
        context.putObject(directoryNode.id, directoryNode, write_directory_data);
      });
    }
  }

  function write_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      directoryData = {};
      context.putObject(directoryNode.data, directoryData, callback);
    }
  }

  context.getObject(SUPER_NODE_ID, ensure_super_node);
}

/**
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
      callback(new Errors.EEXIST(null, path));
    } else if(error && !(error instanceof Errors.ENOENT)) {
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
      context.getObject(parentDirectoryNode.data, write_directory_node);
    }
  }

  function write_directory_node(error, result) {
    if(error) {
      callback(error);
    } else {
      parentDirectoryData = result;
      Node.create({
        guid: context.guid,
        type: NODE_TYPE_DIRECTORY
      }, function(error, result) {
        if(error) {
          callback(error);
          return;
        }
        directoryNode = result;
        directoryNode.nlinks += 1;
        context.putObject(directoryNode.id, directoryNode, write_directory_data);
      });
    }
  }

  function write_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      directoryData = {};
      context.putObject(directoryNode.data, directoryData, update_parent_directory_data);
    }
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, parentPath, parentDirectoryNode, { mtime: now, ctime: now }, callback);
    }
  }

  function update_parent_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, NODE_TYPE_DIRECTORY);
      context.putObject(parentDirectoryNode.data, parentDirectoryData, update_time);
    }
  }

  find_node(context, path, check_if_directory_exists);
}

function access_file(context, path, mode, callback) {
  const { F_OK, R_OK, W_OK, X_OK, S_IXUSR, S_IXGRP, S_IXOTH } = Constants.fsConstants;

  path = normalize(path);
  find_node(context, path, function (err, node) {
    if (err) {
      return callback(err);
    }

    // If we have a node, F_OK is true.
    if(mode === F_OK) {
      return callback(null);
    }

    var st_mode = validateAndMaskMode(node.mode, callback);
    if(!st_mode) return;

    // For any other combo of F_OK, R_OK, W_OK, always allow. Filer user is a root user,
    // so existing files are always OK, readable, and writable
    if(mode & (R_OK | W_OK)) {
      return callback(null);
    }

    // For the case of X_OK, actually check if this file is executable
    if ((mode & X_OK) && (st_mode & (S_IXUSR | S_IXGRP | S_IXOTH))) {
      return callback(null);
    }

    // In any other case, the file isn't accessible
    callback(new Errors.EACCES('permission denied',path)) ; 
  });
}

/**
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
      context.getObject(parentDirectoryNode.data, check_if_node_exists);
    }
  }

  function check_if_node_exists(error, result) {
    if(error) {
      callback(error);
    } else if(ROOT_DIRECTORY_NAME === name) {
      callback(new Errors.EBUSY(null, path));
    } else if(!Object.prototype.hasOwnProperty.call(result, name)) {
      callback(new Errors.ENOENT(null, path));
    } else {
      parentDirectoryData = result;
      directoryNode = parentDirectoryData[name].id;
      context.getObject(directoryNode, check_if_node_is_directory);
    }
  }

  function check_if_node_is_directory(error, result) {
    if(error) {
      callback(error);
    } else if(result.type !== NODE_TYPE_DIRECTORY) {
      callback(new Errors.ENOTDIR(null, path));
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_directory_is_empty);
    }
  }

  function check_if_directory_is_empty(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(Object.keys(directoryData).length > 0) {
        callback(new Errors.ENOTEMPTY(null, path));
      } else {
        remove_directory_entry_from_parent_directory_node();
      }
    }
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, parentPath, parentDirectoryNode, { mtime: now, ctime: now }, remove_directory_node);
    }
  }

  function remove_directory_entry_from_parent_directory_node() {
    delete parentDirectoryData[name];
    context.putObject(parentDirectoryNode.data, parentDirectoryData, update_time);
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

function open_file(context, path, flags, mode, callback) {
  if (typeof mode === 'function'){
    callback = mode;
    mode = null;
  }
  path = normalize(path);
  var name = basename(path);
  var parentPath = dirname(path);

  var directoryNode;
  var directoryData;
  var directoryEntry;
  var fileNode;
  var fileData;

  var followedCount = 0;

  if(ROOT_DIRECTORY_NAME === name) {
    if(flags.includes(O_WRITE)) {
      callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set', path));
    } else {
      find_node(context, path, set_file_node);
    }
  } else {
    find_node(context, parentPath, read_directory_data);
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else if(result.type !== NODE_TYPE_DIRECTORY) {
      callback(new Errors.ENOENT(null, path));
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(Object.prototype.hasOwnProperty.call(directoryData, name)) {
        if(flags.includes(O_EXCLUSIVE)) {
          callback(new Errors.EEXIST('O_CREATE and O_EXCLUSIVE are set, and the named file exists', path));
        } else {
          directoryEntry = directoryData[name];
          if(directoryEntry.type === NODE_TYPE_DIRECTORY && flags.includes(O_WRITE)) {
            callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set', path));
          } else {
            context.getObject(directoryEntry.id, check_if_symbolic_link);
          }
        }
      } else {
        if(!flags.includes(O_CREATE)) {
          callback(new Errors.ENOENT('O_CREATE is not set and the named file does not exist', path));
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
      if(node.type === NODE_TYPE_SYMBOLIC_LINK) {
        followedCount++;
        if(followedCount > SYMLOOP_MAX){
          callback(new Errors.ELOOP(null, path));
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
    if(ROOT_DIRECTORY_NAME === name) {
      if(flags.includes(O_WRITE)) {
        callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set', path));
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
    Node.create({
      guid: context.guid,
      type: NODE_TYPE_FILE
    }, function(error, result) {
      if(error) {
        callback(error);
        return;
      }
      fileNode = result;
      fileNode.nlinks += 1;
      if(mode){
        fileNode.mode = mode;
      }
      context.putObject(fileNode.id, fileNode, write_file_data);
    });
  }

  function write_file_data(error) {
    if(error) {
      callback(error);
    } else {
      fileData = Buffer.alloc(0);
      context.putBuffer(fileNode.data, fileData, update_directory_data);
    }
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, handle_update_result);
    }
  }

  function update_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      directoryData[name] = new DirectoryEntry(fileNode.id, NODE_TYPE_FILE);
      context.putObject(directoryNode.data, directoryData, update_time);
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

function replace_data(context, ofd, buffer, offset, length, callback) {
  var fileNode;

  function return_nbytes(error) {
    if(error) {
      callback(error);
    } else {
      callback(null, length);
    }
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, ofd.path, fileNode, { mtime: now, ctime: now }, return_nbytes);
    }
  }

  function update_file_node(error) {
    if(error) {
      callback(error);
    } else {
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  function write_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;

      var newData = Buffer.alloc(length);
      buffer.copy(newData, 0, offset, offset + length);
      ofd.position = length;

      fileNode.size = length;
      fileNode.version += 1;

      context.putBuffer(fileNode.data, newData, update_file_node);
    }
  }

  context.getObject(ofd.id, write_file_data);
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

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, ofd.path, fileNode, { mtime: now, ctime: now }, return_nbytes);
    }
  }

  function update_file_node(error) {
    if(error) {
      callback(error);
    } else {
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  function update_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileData = result;
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      var _position = (!(undefined === position || null === position)) ? position : ofd.position;
      var newSize = Math.max(fileData.length, _position + length);
      var newData = Buffer.alloc(newSize);
      if(fileData) {
        fileData.copy(newData);
      }
      buffer.copy(newData, _position, offset, offset + length);
      if(undefined === position) {
        ofd.position += length;
      }

      fileNode.size = newSize;
      fileNode.version += 1;

      context.putBuffer(fileNode.data, newData, update_file_node);
    }
  }

  function read_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      context.getBuffer(fileNode.data, update_file_data);
    }
  }

  context.getObject(ofd.id, read_file_data);
}

function read_data(context, ofd, buffer, offset, length, position, callback) {
  var fileNode;
  var fileData;

  function handle_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileData = result;
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      var _position = (!(undefined === position || null === position)) ? position : ofd.position;
      length = (_position + length > buffer.length) ? length - _position : length;
      fileData.copy(buffer, offset, _position, _position + length);
      if(undefined === position) {
        ofd.position += length;
      }
      callback(null, length);
    }
  }

  function read_file_data(error, result) {
    if(error) {
      callback(error);
    } else if(result.type === NODE_TYPE_DIRECTORY) {
      callback(new Errors.EISDIR('the named file is a directory', ofd.path));
    } else {
      fileNode = result;
      context.getBuffer(fileNode.data, handle_file_data);
    }
  }

  context.getObject(ofd.id, read_file_data);
}

function stat_file(context, path, callback) {
  path = normalize(path);
  find_node(context, path, callback);
}

function fstat_file(context, ofd, callback) {
  ofd.getNode(context, callback);
}

function lstat_file(context, path, callback) {
  path = normalize(path);
  var name = basename(path);
  var parentPath = dirname(path);

  var directoryNode;
  var directoryData;

  if(ROOT_DIRECTORY_NAME === name) {
    find_node(context, path, callback);
  } else {
    find_node(context, parentPath, read_directory_data);
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function create_node(error, data) {
    if(error) {
      return callback(error);
    }
    Node.create(data, callback);
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!Object.prototype.hasOwnProperty.call(directoryData, name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file', path));
      } else {
        context.getObject(directoryData[name].id, create_node);
      }
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
  var ctime = Date.now();

  var oldDirectoryNode;
  var oldDirectoryData;
  var newDirectoryNode;
  var newDirectoryData;
  var fileNodeID;
  var fileNode;

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      update_node_times(context, newpath, fileNode, { ctime: ctime }, callback);
    }
  }

  function update_file_node(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      fileNode.nlinks += 1;
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  function read_file_node(error) {
    if(error) {
      callback(error);
    } else {
      context.getObject(fileNodeID, update_file_node);
    }
  }

  function check_if_new_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      newDirectoryData = result;
      if(Object.prototype.hasOwnProperty.call(newDirectoryData, newname)) {
        callback(new Errors.EEXIST('newpath resolves to an existing file', newname));
      } else {
        newDirectoryData[newname] = oldDirectoryData[oldname];
        fileNodeID = newDirectoryData[newname].id;
        context.putObject(newDirectoryNode.data, newDirectoryData, read_file_node);
      }
    }
  }

  function read_new_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      newDirectoryNode = result;
      context.getObject(newDirectoryNode.data, check_if_new_file_exists);
    }
  }

  function check_if_old_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      oldDirectoryData = result;
      if(!Object.prototype.hasOwnProperty.call(oldDirectoryData, oldname)) {
        callback(new Errors.ENOENT('a component of either path prefix does not exist', oldname));
      } else if(oldDirectoryData[oldname].type === NODE_TYPE_DIRECTORY) {
        callback(new Errors.EPERM('oldpath refers to a directory'));
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
      context.getObject(oldDirectoryNode.data, check_if_old_file_exists);
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
      context.putObject(directoryNode.data, directoryData, function(error) {
        if(error) {
          callback(error);
        } else {
          var now = Date.now();
          update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, callback);
        }
      });
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
        context.putObject(fileNode.id, fileNode, function(error) {
          if(error) {
            callback(error);
          } else {          
            update_node_times(context, path, fileNode, { ctime: Date.now() }, update_directory_data);
          }
        });
      }
    }
  }

  function check_if_node_is_directory(error, result) {
    if(error) {
      callback(error);
    } else if(result.type === NODE_TYPE_DIRECTORY) {
      callback(new Errors.EPERM('unlink not permitted on directories', name));
    } else {
      update_file_node(null, result);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!Object.prototype.hasOwnProperty.call(directoryData, name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file', name));
      } else {
        context.getObject(directoryData[name].id, check_if_node_is_directory);
      }
    }
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  find_node(context, parentPath, read_directory_data);
}

function read_directory(context, path, callback) {
  path = normalize(path);

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
    } else if(result.type !== NODE_TYPE_DIRECTORY) {
      callback(new Errors.ENOTDIR(null, path));
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, handle_directory_data);
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

  if(ROOT_DIRECTORY_NAME === name) {
    callback(new Errors.EEXIST(null, name));
  } else {
    find_node(context, parentPath, read_directory_data);
  }

  function read_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryNode = result;
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(Object.prototype.hasOwnProperty.call(directoryData, name)) {
        callback(new Errors.EEXIST(null, name));
      } else {
        write_file_node();
      }
    }
  }

  function write_file_node() {
    Node.create({
      guid: context.guid,
      type: NODE_TYPE_SYMBOLIC_LINK
    }, function(error, result) {
      if(error) {
        callback(error);
        return;
      }
      fileNode = result;
      fileNode.nlinks += 1;

      // If the srcpath isn't absolute, resolve it relative to the dstpath
      // but store both versions, since we'll use the relative one in readlink().
      if(!isAbsolutePath(srcpath)) {
        fileNode.symlink_relpath = srcpath;
        srcpath = Path.resolve(parentPath, srcpath); 
      }

      fileNode.size = srcpath.length;
      fileNode.data = srcpath;
      
      context.putObject(fileNode.id, fileNode, update_directory_data);
    });
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, callback);
    }
  }

  function update_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      directoryData[name] = new DirectoryEntry(fileNode.id, NODE_TYPE_SYMBOLIC_LINK);
      context.putObject(directoryNode.data, directoryData, update_time);
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
      context.getObject(directoryNode.data, check_if_file_exists);
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!Object.prototype.hasOwnProperty.call(directoryData, name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file', name));
      } else {
        context.getObject(directoryData[name].id, check_if_symbolic);
      }
    }
  }

  function check_if_symbolic(error, fileNode) {
    if(error) {
      callback(error);
    } else {
      if(fileNode.type !== NODE_TYPE_SYMBOLIC_LINK) {
        callback(new Errors.EINVAL('path not a symbolic link', path));
      } else {
        // If we were originally given a relative path, return that now vs. the
        // absolute path we've generated and use elsewhere internally.
        var target = fileNode.symlink_relpath ? fileNode.symlink_relpath : fileNode.data;
        callback(null, target);
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
    } else if(node.type === NODE_TYPE_DIRECTORY ) {
      callback(new Errors.EISDIR(null, path));
    } else{
      fileNode = node;
      context.getBuffer(fileNode.data, truncate_file_data);
    }
  }

  function truncate_file_data(error, fileData) {
    if (error) {
      callback(error);
    } else {
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      var data = Buffer.alloc(length);
      if(fileData) {
        fileData.copy(data);
      }
      context.putBuffer(fileNode.data, data, update_file_node);
    }
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, path, fileNode, { mtime: now, ctime: now }, callback);
    }
  }

  function update_file_node (error) {
    if(error) {
      callback(error);
    } else {
      fileNode.size = length;
      fileNode.version += 1;
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  if(length < 0) {
    callback(new Errors.EINVAL('length cannot be negative'));
  } else {
    find_node(context, path, read_file_data);
  }
}

function ftruncate_file(context, ofd, length, callback) {
  var fileNode;

  function read_file_data (error, node) {
    if (error) {
      callback(error);
    } else if(node.type === NODE_TYPE_DIRECTORY ) {
      callback(new Errors.EISDIR());
    } else{
      fileNode = node;
      context.getBuffer(fileNode.data, truncate_file_data);
    }
  }

  function truncate_file_data(error, fileData) {
    if (error) {
      callback(error);
    } else {
      var data;
      if(!fileData) {
        return callback(new Errors.EIO('Expected Buffer'));
      }
      if(fileData) {
        data = fileData.slice(0, length);
      } else {
        data = Buffer.alloc(length);
      }
      context.putBuffer(fileNode.data, data, update_file_node);
    }
  }

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      var now = Date.now();
      update_node_times(context, ofd.path, fileNode, { mtime: now, ctime: now }, callback);
    }
  }

  function update_file_node (error) {
    if(error) {
      callback(error);
    } else {
      fileNode.size = length;
      fileNode.version += 1;
      context.putObject(fileNode.id, fileNode, update_time);
    }
  }

  if(length < 0) {
    callback(new Errors.EINVAL('length cannot be negative'));
  } else {
    ofd.getNode(context, read_file_data);
  }
}

function utimes_file(context, path, atime, mtime, callback) {
  path = normalize(path);

  function update_times(error, node) {
    if (error) {
      callback(error);
    } else {
      update_node_times(context, path, node, { atime: atime, ctime: mtime, mtime: mtime }, callback);
    }
  }

  if (typeof atime !== 'number' || typeof mtime !== 'number') {
    callback(new Errors.EINVAL('atime and mtime must be number', path));
  }
  else if (atime < 0 || mtime < 0) {
    callback(new Errors.EINVAL('atime and mtime must be positive integers', path));
  }
  else {
    find_node(context, path, update_times);
  }
}

function futimes_file(context, ofd, atime, mtime, callback) {

  function update_times (error, node) {
    if (error) {
      callback(error);
    } else {
      update_node_times(context, ofd.path, node, { atime: atime, ctime: mtime, mtime: mtime }, callback);
    }
  }

  if (typeof atime !== 'number' || typeof mtime !== 'number') {
    callback(new Errors.EINVAL('atime and mtime must be a number'));
  }
  else if (atime < 0 || mtime < 0) {
    callback(new Errors.EINVAL('atime and mtime must be positive integers'));
  }
  else {
    ofd.getNode(context, update_times);
  }
}

function setxattr_file(context, path, name, value, flag, callback) {
  path = normalize(path);

  function setxattr(error, node) {
    if(error) {
      return callback(error);
    }
    set_extended_attribute(context, path, node, name, value, flag, callback);
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL('attribute name must be a string', path));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string', path));
  }
  else if (flag !== null &&
           flag !== XATTR_CREATE && flag !== XATTR_REPLACE) {
    callback(new Errors.EINVAL('invalid flag, must be null, XATTR_CREATE or XATTR_REPLACE', path));
  }
  else {
    find_node(context, path, setxattr);
  }
}

function fsetxattr_file (context, ofd, name, value, flag, callback) {
  function setxattr(error, node) {
    if(error) {
      return callback(error);
    }
    set_extended_attribute(context, ofd.path, node, name, value, flag, callback);
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL('attribute name must be a string'));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else if (flag !== null &&
           flag !== XATTR_CREATE && flag !== XATTR_REPLACE) {
    callback(new Errors.EINVAL('invalid flag, must be null, XATTR_CREATE or XATTR_REPLACE'));
  }
  else {
    ofd.getNode(context, setxattr);
  }
}

function getxattr_file (context, path, name, callback) {
  path = normalize(path);

  function get_xattr(error, node) {
    if(error) {
      return callback(error);
    }

    var xattrs = node.xattrs;

    if (!Object.prototype.hasOwnProperty.call(xattrs, name)) {
      callback(new Errors.ENOATTR(null, path));
    }
    else {
      callback(null, xattrs[name]);
    }
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL('attribute name must be a string', path));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string', path));
  }
  else {
    find_node(context, path, get_xattr);
  }
}

function fgetxattr_file (context, ofd, name, callback) {

  function get_xattr (error, node) {
    if (error) {
      return callback(error);
    }

    var xattrs = node.xattrs;

    if (!Object.prototype.hasOwnProperty.call(xattrs, name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      callback(null, xattrs[name]);
    }
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL());
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    ofd.getNode(context, get_xattr);
  }
}

function removexattr_file (context, path, name, callback) {
  path = normalize(path);

  function remove_xattr (error, node) {
    if (error) {
      return callback(error);
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, path, node, { ctime: Date.now() }, callback);
      }
    }

    var xattrs = node.xattrs;

    if (!Object.prototype.hasOwnProperty.call(xattrs, name)) {
      callback(new Errors.ENOATTR(null, path));
    }
    else {
      delete xattrs[name];
      context.putObject(node.id, node, update_time);
    }
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL('attribute name must be a string', path));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string', path));
  }
  else {
    find_node(context, path, remove_xattr);
  }
}

function fremovexattr_file (context, ofd, name, callback) {

  function remove_xattr (error, node) {
    if (error) {
      return callback(error);
    }

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, ofd.path, node, { ctime: Date.now() }, callback);
      }
    }

    var xattrs = node.xattrs;

    if (!Object.prototype.hasOwnProperty.call(xattrs, name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      delete xattrs[name];
      context.putObject(node.id, node, update_time);
    }
  }

  if (typeof name !== 'string') {
    callback(new Errors.EINVAL('attribute name must be a string'));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    ofd.getNode(context, remove_xattr);
  }
}

function validate_flags(flags) {
  return Object.prototype.hasOwnProperty.call(O_FLAGS, flags) ? O_FLAGS[flags] : null;
}

function validate_file_options(options, enc, fileMode){
  if(!options) {
    options = { encoding: enc, flag: fileMode };
  } else if(typeof options === 'function') {
    options = { encoding: enc, flag: fileMode };
  } else if(typeof options === 'string') {
    options = { encoding: options, flag: fileMode };
  }
  return options;
}

function open(context, path, flags, mode, callback) {
  if (arguments.length < 5 ){
    callback = arguments[arguments.length - 1];
    mode = 0o644;
  }
  else {
    mode = validateAndMaskMode(mode, FULL_READ_WRITE_EXEC_PERMISSIONS, callback);
  }

  function check_result(error, fileNode) {
    if(error) {
      callback(error);
    } else {
      var position;
      if(flags.includes(O_APPEND)) {
        position = fileNode.size;
      } else {
        position = 0;
      }
      var openFileDescription = new OpenFileDescription(path, fileNode.id, flags, position);
      var fd = openFiles.allocDescriptor(openFileDescription);
      callback(null, fd);
    }
  }

  flags = validate_flags(flags);
  if(!flags) {
    return callback(new Errors.EINVAL('flags is not valid'), path);
  }

  open_file(context, path, flags, mode, check_result);
}

function close(context, fd, callback) {
  if(!openFiles.getOpenFileDescription(fd)) {
    callback(new Errors.EBADF());
  } else {
    openFiles.releaseDescriptor(fd);
    callback(null);
  }
}

function mknod(context, path, type, callback) {
  make_node(context, path, type, callback);
}

function mkdir(context, path, mode, callback) {
  if (arguments.length < 4) {
    callback = mode;
    mode = FULL_READ_WRITE_EXEC_PERMISSIONS;
  } else {
    mode = validateAndMaskMode(mode, FULL_READ_WRITE_EXEC_PERMISSIONS, callback);
    if(!mode) return;
  }
 
  make_directory(context, path, callback);
}

function access(context, path, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode = Constants.fsConstants.F_OK;
  }

  mode = mode | Constants.fsConstants.F_OK;
  access_file(context, path, mode, callback);
}

function mkdtemp(context, prefix, options, callback) {
  callback = arguments[arguments.length - 1];
  if(!prefix) {
    return callback(new Error('filename prefix is required'));
  } 

  let random = shared.randomChars(6);
  var path = prefix + '-' + random; 

  make_directory(context, path, function(error) {
    callback(error, path);
  });  
}

function rmdir(context, path, callback) {
  remove_directory(context, path, callback);
}

function stat(context, path, callback) {
  function check_result(error, result) {
    if(error) {
      callback(error);
    } else {
      var stats = new Stats(path, result, context.name);
      callback(null, stats);
    }
  }

  stat_file(context, path, check_result);
}

function fstat(context, fd, callback) {
  function check_result(error, result) {
    if(error) {
      callback(error);
    } else {
      var stats = new Stats(ofd.path, result, context.name);
      callback(null, stats);
    }
  }

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else {
    fstat_file(context, ofd, check_result);
  }
}

function link(context, oldpath, newpath, callback) {
  link_node(context, oldpath, newpath, callback);
}

function unlink(context, path, callback) {
  unlink_node(context, path, callback);
}

function read(context, fd, buffer, offset, length, position, callback) {
  // Follow how node.js does this
  function wrapped_cb(err, bytesRead) {
    // Retain a reference to buffer so that it can't be GC'ed too soon.
    callback(err, bytesRead || 0, buffer);
  }

  offset = (undefined === offset) ? 0 : offset;
  length = (undefined === length) ? buffer.length - offset : length;
  callback = arguments[arguments.length - 1];

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!ofd.flags.includes(O_READ)) {
    callback(new Errors.EBADF('descriptor does not permit reading'));
  } else {
    read_data(context, ofd, buffer, offset, length, position, wrapped_cb);
  }
}

function fsync(context, fd, callback) {
  if(validateInteger(fd, callback) !== fd) return;
  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else {
    callback();
  }
}

function readFile(context, path, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, null, 'r');

  var flags = validate_flags(options.flag || 'r');
  if(!flags) {
    return callback(new Errors.EINVAL('flags is not valid', path));
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
    var fd = openFiles.allocDescriptor(ofd);

    function cleanup() {
      openFiles.releaseDescriptor(fd);
    }

    fstat_file(context, ofd, function(err, fstatResult) {
      if(err) {
        cleanup();
        return callback(err);
      }

      var stats = new Stats(ofd.path, fstatResult, context.name);

      if(stats.isDirectory()) {
        cleanup();
        return callback(new Errors.EISDIR('illegal operation on directory', path));
      }

      var size = stats.size;
      var buffer = Buffer.alloc(size);

      read_data(context, ofd, buffer, 0, size, 0, function(err) {
        cleanup();

        if(err) {
          return callback(err);
        }

        var data;
        if(options.encoding === 'utf8') {
          data = buffer.toString('utf8');
        } else {
          data = buffer;
        }
        callback(null, data);
      });
    });
  });
}

function write(context, fd, buffer, offset, length, position, callback) {
  callback = arguments[arguments.length - 1];
  offset = (undefined === offset) ? 0 : offset;
  length = (undefined === length) ? buffer.length - offset : length;

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else if(buffer.length - offset < length) {
    callback(new Errors.EIO('input buffer is too small'));
  } else {
    write_data(context, ofd, buffer, offset, length, position, callback);
  }
}

function writeFile(context, path, data, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, 'utf8', 'w');

  var flags = validate_flags(options.flag || 'w');
  if(!flags) {
    return callback(new Errors.EINVAL('flags is not valid', path));
  }

  data = data || '';
  if(typeof data === 'number') {
    data = '' + data;
  }
  if(typeof data === 'string' && options.encoding === 'utf8') {
    data = Buffer.from(data);
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
    var fd = openFiles.allocDescriptor(ofd);

    replace_data(context, ofd, data, 0, data.length, function(err) {
      openFiles.releaseDescriptor(fd);

      if(err) {
        return callback(err);
      }
      callback(null);
    });
  });
}

function appendFile(context, path, data, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, 'utf8', 'a');

  var flags = validate_flags(options.flag || 'a');
  if(!flags) {
    return callback(new Errors.EINVAL('flags is not valid', path));
  }

  data = data || '';
  if(typeof data === 'number') {
    data = '' + data;
  }
  if(typeof data === 'string' && options.encoding === 'utf8') {
    data = Buffer.from(data);
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, fileNode.size);
    var fd = openFiles.allocDescriptor(ofd);

    write_data(context, ofd, data, 0, data.length, ofd.position, function(err) {
      openFiles.releaseDescriptor(fd);

      if(err) {
        return callback(err);
      }
      callback(null);
    });
  });
}

function exists(context, path, callback) {
  function cb(err) {
    callback(err ? false : true);
  }
  stat(context, path, cb);
}

function validateInteger(value, callback) {
  if (typeof value !== 'number') {
    callback(new Errors.EINVAL('Expected integer', value));
    return;
  }

  return value;
}

// Based on https://github.com/nodejs/node/blob/c700cc42da9cf73af9fec2098520a6c0a631d901/lib/internal/validators.js#L21
var octalReg = /^[0-7]+$/;
function isUint32(value) {
  return value === (value >>> 0);
}
// Validator for mode_t (the S_* constants). Valid numbers or octal strings
// will be masked with 0o777 to be consistent with the behavior in POSIX APIs.
function validateAndMaskMode(value, def, callback) {
  if(typeof def === 'function') {
    callback = def;
    def = undefined;
  }

  if (isUint32(value)) {
    return value & FULL_READ_WRITE_EXEC_PERMISSIONS;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      callback(new Errors.EINVAL('mode not a valid an integer value', value));
      return false;
    } else {
      // 2 ** 32 === 4294967296
      callback(new Errors.EINVAL('mode not a valid an integer value', value));
      return false;
    }
  }

  if (typeof value === 'string') {
    if (!octalReg.test(value)) {
      callback(new Errors.EINVAL('mode not a valid octal string', value));
      return false;
    }
    var parsed = parseInt(value, 8);
    return parsed & FULL_READ_WRITE_EXEC_PERMISSIONS;
  }

  // TODO(BridgeAR): Only return `def` in case `value === null`
  if (def !== undefined) {
    return def;
  }

  callback(new Errors.EINVAL('mode not valid', value));
  return false;
}

function chmod_file(context, path, mode, callback) {
  path = normalize(path);

  function update_mode(error, node) {
    if (error) {
      callback(error);
    } else {
      node.mode = mode;
      update_node_times(context, path, node, { mtime: Date.now() }, callback);
    }
  }

  if (typeof mode !== 'number') {
    callback(new Errors.EINVAL('mode must be number', path));
  }
  else {
    find_node(context, path, update_mode);
  }
}

function fchmod_file(context, ofd, mode, callback) {
  function update_mode(error, node) {
    if (error) {
      callback(error);
    } else {
      node.mode = mode;
      update_node_times(context, ofd.path, node, { mtime: Date.now() }, callback);
    }
  }

  if (typeof mode !== 'number') {
    callback(new Errors.EINVAL('mode must be a number'));
  }
  else {
    ofd.getNode(context, update_mode);
  }
}

function chown_file(context, path, uid, gid, callback) {
  path = normalize(path);

  function update_owner(error, node) {
    if (error) {
      callback(error);
    } else {
      node.uid = uid;
      node.gid = gid;
      update_node_times(context, path, node, { mtime: Date.now() }, callback);
    }
  }

  find_node(context, path, update_owner);
}

function fchown_file(context, ofd, uid, gid, callback) {
  function update_owner(error, node) {
    if (error) {
      callback(error);
    } else {
      node.uid = uid;
      node.gid = gid;
      update_node_times(context, ofd.path, node, { mtime: Date.now() }, callback);
    }
  }

  ofd.getNode(context, update_owner);
}

function getxattr(context, path, name, callback) {
  getxattr_file(context, path, name, callback);
}

function fgetxattr(context, fd, name, callback) {
  var ofd = openFiles.getOpenFileDescription(fd);
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else {
    fgetxattr_file(context, ofd, name, callback);
  }
}

function setxattr(context, path, name, value, flag, callback) {
  if(typeof flag === 'function') {
    callback = flag;
    flag = null;
  }

  setxattr_file(context, path, name, value, flag, callback);
}

function fsetxattr(context, fd, name, value, flag, callback) {
  if(typeof flag === 'function') {
    callback = flag;
    flag = null;
  }

  var ofd = openFiles.getOpenFileDescription(fd);
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else if (!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  }
  else {
    fsetxattr_file(context, ofd, name, value, flag, callback);
  }
}

function removexattr(context, path, name, callback) {
  removexattr_file(context, path, name, callback);
}

function fremovexattr(context, fd, name, callback) {
  var ofd = openFiles.getOpenFileDescription(fd);
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else if (!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  }
  else {
    fremovexattr_file(context, ofd, name, callback);
  }
}

function lseek(context, fd, offset, whence, callback) {
  function update_descriptor_position(error, stats) {
    if(error) {
      callback(error);
    } else {
      if(stats.size + offset < 0) {
        callback(new Errors.EINVAL('resulting file offset would be negative'));
      } else {
        ofd.position = stats.size + offset;
        callback(null, ofd.position);
      }
    }
  }

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  }

  if('SET' === whence) {
    if(offset < 0) {
      callback(new Errors.EINVAL('resulting file offset would be negative'));
    } else {
      ofd.position = offset;
      callback(null, ofd.position);
    }
  } else if('CUR' === whence) {
    if(ofd.position + offset < 0) {
      callback(new Errors.EINVAL('resulting file offset would be negative'));
    } else {
      ofd.position += offset;
      callback(null, ofd.position);
    }
  } else if('END' === whence) {
    fstat_file(context, ofd, update_descriptor_position);
  } else {
    callback(new Errors.EINVAL('whence argument is not a proper value'));
  }
}

function readdir(context, path, callback) {
  read_directory(context, path, callback);
}

function toUnixTimestamp(time) {
  if (typeof time === 'number') {
    return time;
  }
  if (typeof time === 'object' && typeof time.getTime === 'function') {
    return time.getTime();
  }
}

function utimes(context, path, atime, mtime, callback) {
  var currentTime = Date.now();
  atime = (atime) ? toUnixTimestamp(atime) : toUnixTimestamp(currentTime);
  mtime = (mtime) ? toUnixTimestamp(mtime) : toUnixTimestamp(currentTime);

  utimes_file(context, path, atime, mtime, callback);
}

function futimes(context, fd, atime, mtime, callback) {
  var currentTime = Date.now();
  atime = (atime) ? toUnixTimestamp(atime) : toUnixTimestamp(currentTime);
  mtime = (mtime) ? toUnixTimestamp(mtime) : toUnixTimestamp(currentTime);

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else {
    futimes_file(context, ofd, atime, mtime, callback);
  }
}

function chmod(context, path, mode, callback) {
  mode = validateAndMaskMode(mode, callback);
  if(!mode) return;

  chmod_file(context, path, mode, callback);
}

function fchmod(context, fd, mode, callback) {
  mode = validateAndMaskMode(mode, callback);
  if(!mode) return;

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else {
    fchmod_file(context, ofd, mode, callback);
  }
}

function chown(context, path, uid, gid, callback) {
  if(!isUint32(uid)) {
    return callback(new Errors.EINVAL('uid must be a valid integer', uid));
  }
  if(!isUint32(gid)) {
    return callback(new Errors.EINVAL('gid must be a valid integer', gid));
  }

  chown_file(context, path, uid, gid, callback);
}

function fchown(context, fd, uid, gid, callback) {
  if(!isUint32(uid)) {
    return callback(new Errors.EINVAL('uid must be a valid integer', uid));
  }
  if(!isUint32(gid)) {
    return callback(new Errors.EINVAL('gid must be a valid integer', gid));
  }

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else {
    fchown_file(context, ofd, uid, gid, callback);
  }
}

function rename(context, oldpath, newpath, callback) {
  oldpath = normalize(oldpath);
  newpath = normalize(newpath);

  var oldParentPath = Path.dirname(oldpath);
  var newParentPath = Path.dirname(oldpath);
  var oldName = Path.basename(oldpath);
  var newName = Path.basename(newpath);
  var oldParentDirectory, oldParentData;
  var newParentDirectory, newParentData;
  var ctime = Date.now();
  var fileNode;

  function update_times(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      update_node_times(context, newpath, fileNode, { ctime: ctime }, callback);
    }
  }

  function read_new_directory(error) {
    if(error) {
      callback(error);
    } else {
      context.getObject(newParentData[newName].id, update_times);
    }
  }

  function update_old_parent_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      if(oldParentDirectory.id === newParentDirectory.id) {
        oldParentData = newParentData;
      }
      delete oldParentData[oldName];
      context.putObject(oldParentDirectory.data, oldParentData, read_new_directory);
    }
  }

  function update_new_parent_directory_data(error) {
    if(error) {
      callback(error);
    } else {
      newParentData[newName] = oldParentData[oldName];
      context.putObject(newParentDirectory.data, newParentData, update_old_parent_directory_data);
    }
  }

  function check_if_new_directory_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      newParentData = result;
      if(Object.prototype.hasOwnProperty.call(newParentData, newName)) {
        remove_directory(context, newpath, update_new_parent_directory_data);
      } else {
        update_new_parent_directory_data();
      }
    }
  }

  function read_new_parent_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      newParentDirectory = result;
      context.getObject(newParentDirectory.data, check_if_new_directory_exists);
    }
  }

  function get_new_parent_directory(error, result) {
    if(error) {
      callback(error);
    } else {
      oldParentData = result;
      find_node(context, newParentPath, read_new_parent_directory_data);
    }
  }

  function read_parent_directory_data(error, result) {
    if(error) {
      callback(error);
    } else {
      oldParentDirectory = result;
      context.getObject(result.data, get_new_parent_directory);
    }
  }

  function unlink_old_file(error) {
    if(error) {
      callback(error);
    } else {
      unlink_node(context, oldpath, callback);
    }
  }

  function check_node_type(error, node) {
    if(error) {
      callback(error);
    } else if(node.type === NODE_TYPE_DIRECTORY) {
      find_node(context, oldParentPath, read_parent_directory_data);
    } else {
      link_node(context, oldpath, newpath, unlink_old_file);
    }
  }

  find_node(context, oldpath, check_node_type);
}

function symlink(context, srcpath, dstpath, type, callback) {
  // NOTE: we support passing the `type` arg, but ignore it.
  callback = arguments[arguments.length - 1];
  make_symbolic_link(context, srcpath, dstpath, callback);
}

function readlink(context, path, callback) {
  read_link(context, path, callback);
}

function lstat(context, path, callback) {
  function check_result(error, result) {
    if(error) {
      callback(error);
    } else {
      var stats = new Stats(path, result, context.name);
      callback(null, stats);
    }
  }

  lstat_file(context, path, check_result);
}

function truncate(context, path, length, callback) {
  // NOTE: length is optional
  callback = arguments[arguments.length - 1];
  length = length || 0;

  if(validateInteger(length, callback) !== length) return;

  truncate_file(context, path, length, callback);
}

function ftruncate(context, fd, length, callback) {
  // NOTE: length is optional
  callback = arguments[arguments.length - 1];
  length = length || 0;

  var ofd = openFiles.getOpenFileDescription(fd);
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!ofd.flags.includes(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else {
    if(validateInteger(length, callback) !== length) return;
    ftruncate_file(context, ofd, length, callback);
  }
}

module.exports = {
  appendFile,
  access,
  chown,
  chmod,
  close,
  // copyFile - https://github.com/filerjs/filer/issues/436
  ensureRootDirectory: ensure_root_directory,
  exists,
  fchown,
  fchmod,
  // fdatasync - https://github.com/filerjs/filer/issues/653
  fgetxattr,
  fremovexattr,
  fsetxattr,
  fstat,
  fsync,
  ftruncate,
  futimes,
  getxattr,
  // lchown - https://github.com/filerjs/filer/issues/620
  // lchmod - https://github.com/filerjs/filer/issues/619
  link,
  lseek,
  lstat,
  mkdir,
  mkdtemp,
  mknod,
  open,
  readdir,
  read,
  readFile,
  readlink,
  // realpath - https://github.com/filerjs/filer/issues/85
  removexattr,
  rename,
  rmdir,
  setxattr,
  stat,
  symlink,
  truncate,
  // unwatchFile - implemented in interface.js
  unlink,
  utimes,
  // watch - implemented in interface.js
  // watchFile - implemented in interface.js
  writeFile,
  write
};
