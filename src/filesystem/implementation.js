var _ = require('../../lib/nodash.js');

var TextDecoder = require('../../lib/encoding.js').TextDecoder;
var TextEncoder = require('../../lib/encoding.js').TextEncoder;

var Path = require('../path.js');
var normalize = Path.normalize;
var dirname = Path.dirname;
var basename = Path.basename;
var isAbsolutePath = Path.isAbsolute;
var isNullPath = Path.isNull;

var Constants = require('../constants.js');
var MODE_FILE = Constants.MODE_FILE;
var MODE_DIRECTORY = Constants.MODE_DIRECTORY;
var MODE_SYMBOLIC_LINK = Constants.MODE_SYMBOLIC_LINK;
var MODE_META = Constants.MODE_META;

var ROOT_DIRECTORY_NAME = Constants.ROOT_DIRECTORY_NAME;
var SUPER_NODE_ID = Constants.SUPER_NODE_ID;
var SYMLOOP_MAX = Constants.SYMLOOP_MAX;

var O_READ = Constants.O_READ;
var O_WRITE = Constants.O_WRITE;
var O_CREATE = Constants.O_CREATE;
var O_EXCLUSIVE = Constants.O_EXCLUSIVE;
var O_TRUNCATE = Constants.O_TRUNCATE;
var O_APPEND = Constants.O_APPEND;
var O_FLAGS = Constants.O_FLAGS;

var XATTR_CREATE = Constants.XATTR_CREATE;
var XATTR_REPLACE = Constants.XATTR_REPLACE;
var FS_NOMTIME = Constants.FS_NOMTIME;
var FS_NOCTIME = Constants.FS_NOCTIME;

var Errors = require('../errors.js');
var DirectoryEntry = require('../directory-entry.js');
var OpenFileDescription = require('../open-file-description.js');
var SuperNode = require('../super-node.js');
var Node = require('../node.js');
var Stats = require('../stats.js');

/**
 * Many functions below use this callback pattern. If it's not
 * re-defined, we use this to generate a callback. NOTE: this
 * can be use for callbacks of both forms without problem (i.e.,
 * since result will be undefined if not returned):
 *  - callback(error)
 *  - callback(error, result)
 */
function standard_check_result_cb(callback) {
  return function(error, result) {
    if(error) {
      callback(error);
    } else {
      callback(null, result);
    }
  };
}

/**
 * Update node times. Only passed times are modified (undefined times are ignored)
 * and filesystem flags are examined in order to override update logic.
 */
function update_node_times(context, path, node, times, callback) {
  // Honour mount flags for how we update times
  var flags = context.flags;
  if(_(flags).contains(FS_NOCTIME)) {
    delete times.ctime;
  }
  if(_(flags).contains(FS_NOMTIME)) {
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
    context.put(node.id, node, complete);
  } else {
    complete();
  }
}

/**
 * make_node()
 */
// in: file or directory path
// out: new node representing file/directory
function make_node(context, path, mode, callback) {
  if(mode !== MODE_DIRECTORY && mode !== MODE_FILE) {
    return callback(new Errors.EINVAL('mode must be a directory or file'));
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
    } else if(parentDirectoryNode.mode !== MODE_DIRECTORY) {
      callback(new Errors.ENOTDIR('a component of the path prefix is not a directory'));
    } else {
      parentNode = parentDirectoryNode;
      find_node(context, path, check_if_node_exists);
    }
  }

  // Check if the node to be created already exists
  function check_if_node_exists(error, result) {
    if(!error && result) {
      callback(new Errors.EEXIST('path name already exists'));
    } else if(error && !(error instanceof Errors.ENOENT)) {
      callback(error);
    } else {
      context.get(parentNode.data, create_node);
    }
  }

  // Create the new node
  function create_node(error, result) {
    if(error) {
      callback(error);
    } else {
      parentNodeData = result;
      node = new Node(undefined, mode);
      node.nlinks += 1;
      context.put(node.id, node, update_parent_node_data);
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
      parentNodeData[name] = new DirectoryEntry(node.id, mode);
      context.put(parentNode.data, parentNodeData, update_time);
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

  function read_root_directory_node(error, superNode) {
    if(error) {
      callback(error);
    } else if(!superNode || superNode.mode !== MODE_META || !superNode.rnode) {
      callback(new Errors.EFILESYSTEMERROR());
    } else {
      context.get(superNode.rnode, check_root_directory_node);
    }
  }

  function check_root_directory_node(error, rootDirectoryNode) {
    if(error) {
      callback(error);
    } else if(!rootDirectoryNode) {
      callback(new Errors.ENOENT());
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
      callback(new Errors.ENOTDIR('a component of the path prefix is not a directory'));
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
        callback(new Errors.ENOENT());
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
          callback(new Errors.ELOOP());
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
      context.get(SUPER_NODE_ID, read_root_directory_node);
    } else {
      find_node(context, parentPath, read_parent_directory_data);
    }
  }

  if(ROOT_DIRECTORY_NAME == name) {
    context.get(SUPER_NODE_ID, read_root_directory_node);
  } else {
    find_node(context, parentPath, read_parent_directory_data);
  }
}


/**
 * set extended attribute (refactor)
 */
function set_extended_attribute (context, path_or_fd, name, value, flag, callback) {
  var path;

  function set_xattr (error, node) {
    var xattr = (node ? node.xattrs[name] : null);

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, path, node, { ctime: Date.now() }, callback);
      }
    }

    if (error) {
      callback(error);
    }
    else if (flag === XATTR_CREATE && node.xattrs.hasOwnProperty(name)) {
      callback(new Errors.EEXIST('attribute already exists'));
    }
    else if (flag === XATTR_REPLACE && !node.xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      node.xattrs[name] = value;
      context.put(node.id, node, update_time);
    }
  }

  if (typeof path_or_fd == 'string') {
    path = path_or_fd;
    find_node(context, path_or_fd, set_xattr);
  }
  else if (typeof path_or_fd == 'object' && typeof path_or_fd.id == 'string') {
    path = path_or_fd.path;
    context.get(path_or_fd.id, set_xattr);
  }
  else {
    callback(new Errors.EINVAL('path or file descriptor of wrong type'));
  }
}

/**
 * make_root_directory
 */
// Note: this should only be invoked when formatting a new file system
function make_root_directory(context, callback) {
  var superNode;
  var directoryNode;
  var directoryData;

  function write_super_node(error, existingNode) {
    if(!error && existingNode) {
      callback(new Errors.EEXIST());
    } else if(error && !(error instanceof Errors.ENOENT)) {
      callback(error);
    } else {
      superNode = new SuperNode();
      context.put(superNode.id, superNode, write_directory_node);
    }
  }

  function write_directory_node(error) {
    if(error) {
      callback(error);
    } else {
      directoryNode = new Node(superNode.rnode, MODE_DIRECTORY);
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

  context.get(SUPER_NODE_ID, write_super_node);
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
      callback(new Errors.EEXIST());
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
      parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
      context.put(parentDirectoryNode.data, parentDirectoryData, update_time);
    }
  }

  find_node(context, path, check_if_directory_exists);
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
      context.get(parentDirectoryNode.data, check_if_node_exists);
    }
  }

  function check_if_node_exists(error, result) {
    if(error) {
      callback(error);
    } else if(ROOT_DIRECTORY_NAME == name) {
      callback(new Errors.EBUSY());
    } else if(!_(result).has(name)) {
      callback(new Errors.ENOENT());
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
      callback(new Errors.ENOTDIR());
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
        callback(new Errors.ENOTEMPTY());
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
    context.put(parentDirectoryNode.data, parentDirectoryData, update_time);
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
      callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set'));
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
          callback(new Errors.ENOENT('O_CREATE and O_EXCLUSIVE are set, and the named file exists'));
        } else {
          directoryEntry = directoryData[name];
          if(directoryEntry.type == MODE_DIRECTORY && _(flags).contains(O_WRITE)) {
            callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set'));
          } else {
            context.get(directoryEntry.id, check_if_symbolic_link);
          }
        }
      } else {
        if(!_(flags).contains(O_CREATE)) {
          callback(new Errors.ENOENT('O_CREATE is not set and the named file does not exist'));
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
          callback(new Errors.ELOOP());
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
        callback(new Errors.EISDIR('the named file is a directory and O_WRITE is set'));
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
      directoryData[name] = new DirectoryEntry(fileNode.id, MODE_FILE);
      context.put(directoryNode.data, directoryData, update_time);
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
      context.put(fileNode.id, fileNode, update_time);
    }
  }

  function write_file_data(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      var newData = new Uint8Array(length);
      var bufferWindow = buffer.subarray(offset, offset + length);
      newData.set(bufferWindow);
      ofd.position = length;

      fileNode.size = length;
      fileNode.version += 1;

      context.put(fileNode.data, newData, update_file_node);
    }
  }

  context.get(ofd.id, write_file_data);
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
      context.put(fileNode.id, fileNode, update_time);
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
      var bufferWindow = buffer.subarray(offset, offset + length);
      newData.set(bufferWindow, _position);
      if(undefined === position) {
        ofd.position += length;
      }

      fileNode.size = newSize;
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
  find_node(context, path, standard_check_result_cb(callback));
}

function fstat_file(context, ofd, callback) {
  context.get(ofd.id, standard_check_result_cb(callback));
}

function lstat_file(context, path, callback) {
  path = normalize(path);
  var name = basename(path);
  var parentPath = dirname(path);

  var directoryNode;
  var directoryData;

  if(ROOT_DIRECTORY_NAME == name) {
    find_node(context, path, standard_check_result_cb(callback));
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
        callback(new Errors.ENOENT('a component of the path does not name an existing file'));
      } else {
        context.get(directoryData[name].id, standard_check_result_cb(callback));
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

  var oldDirectoryNode;
  var oldDirectoryData;
  var newDirectoryNode;
  var newDirectoryData;
  var fileNode;

  function update_time(error) {
    if(error) {
      callback(error);
    } else {
      update_node_times(context, newpath,  fileNode, { ctime: Date.now() }, callback);
    }
  }

  function update_file_node(error, result) {
    if(error) {
      callback(error);
    } else {
      fileNode = result;
      fileNode.nlinks += 1;
      context.put(fileNode.id, fileNode, update_time);
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
        callback(new Errors.EEXIST('newpath resolves to an existing file'));
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
        callback(new Errors.ENOENT('a component of either path prefix does not exist'));
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
      context.put(directoryNode.data, directoryData, function(error) {
        var now = Date.now();
        update_node_times(context, parentPath, directoryNode, { mtime: now, ctime: now }, callback);
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
        context.put(fileNode.id, fileNode, function(error) {
          update_node_times(context, path, fileNode, { ctime: Date.now() }, update_directory_data);
        });
      }
    }
  }

  function check_if_file_exists(error, result) {
    if(error) {
      callback(error);
    } else {
      directoryData = result;
      if(!_(directoryData).has(name)) {
        callback(new Errors.ENOENT('a component of the path does not name an existing file'));
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
    callback(new Errors.EEXIST());
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
        callback(new Errors.EEXIST());
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
      directoryData[name] = new DirectoryEntry(fileNode.id, MODE_SYMBOLIC_LINK);
      context.put(directoryNode.data, directoryData, update_time);
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
        callback(new Errors.ENOENT('a component of the path does not name an existing file'));
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
        callback(new Errors.EINVAL("path not a symbolic link"));
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
      callback(new Errors.EISDIR());
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
      context.put(fileNode.id, fileNode, update_time);
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
    } else if(node.mode == MODE_DIRECTORY ) {
      callback(new Errors.EISDIR());
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
      context.put(fileNode.id, fileNode, update_time);
    }
  }

  if(length < 0) {
    callback(new Errors.EINVAL('length cannot be negative'));
  } else {
    context.get(ofd.id, read_file_data);
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

  if (typeof atime != 'number' || typeof mtime != 'number') {
    callback(new Errors.EINVAL('atime and mtime must be number'));
  }
  else if (atime < 0 || mtime < 0) {
    callback(new Errors.EINVAL('atime and mtime must be positive integers'));
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

  if (typeof atime != 'number' || typeof mtime != 'number') {
    callback(new Errors.EINVAL('atime and mtime must be a number'));
  }
  else if (atime < 0 || mtime < 0) {
    callback(new Errors.EINVAL('atime and mtime must be positive integers'));
  }
  else {
    context.get(ofd.id, update_times);
  }
}

function setxattr_file(context, path, name, value, flag, callback) {
  path = normalize(path);

  if (typeof name != 'string') {
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
    set_extended_attribute(context, path, name, value, flag, callback);
  }
}

function fsetxattr_file (context, ofd, name, value, flag, callback) {
  if (typeof name != 'string') {
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
    set_extended_attribute(context, ofd, name, value, flag, callback);
  }
}

function getxattr_file (context, path, name, callback) {
  path = normalize(path);

  function get_xattr(error, node) {
    var xattr = (node ? node.xattrs[name] : null);

    if (error) {
      callback (error);
    }
    else if (!node.xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      callback(null, node.xattrs[name]);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL('attribute name must be a string'));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    find_node(context, path, get_xattr);
  }
}

function fgetxattr_file (context, ofd, name, callback) {

  function get_xattr (error, node) {
    var xattr = (node ? node.xattrs[name] : null);

    if (error) {
      callback(error);
    }
    else if (!node.xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      callback(null, node.xattrs[name]);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL());
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    context.get(ofd.id, get_xattr);
  }
}

function removexattr_file (context, path, name, callback) {
  path = normalize(path);

  function remove_xattr (error, node) {
    var xattr = (node ? node.xattrs : null);

    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, path, node, { ctime: Date.now() }, callback);
      }
    }

    if (error) {
      callback(error);
    }
    else if (!xattr.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      delete node.xattrs[name];
      context.put(node.id, node, update_time);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL('attribute name must be a string'));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    find_node(context, path, remove_xattr);
  }
}

function fremovexattr_file (context, ofd, name, callback) {

  function remove_xattr (error, node) {
    function update_time(error) {
      if(error) {
        callback(error);
      } else {
        update_node_times(context, ofd.path, node, { ctime: Date.now() }, callback);
      }
    }

    if (error) {
      callback(error);
    }
    else if (!node.xattrs.hasOwnProperty(name)) {
      callback(new Errors.ENOATTR());
    }
    else {
      delete node.xattrs[name];
      context.put(node.id, node, update_time);
    }
  }

  if (typeof name != 'string') {
    callback(new Errors.EINVAL('attribute name must be a string'));
  }
  else if (!name) {
    callback(new Errors.EINVAL('attribute name cannot be an empty string'));
  }
  else {
    context.get(ofd.id, remove_xattr);
  }
}

function validate_flags(flags) {
  if(!_(O_FLAGS).has(flags)) {
    return null;
  }
  return O_FLAGS[flags];
}

function validate_file_options(options, enc, fileMode){
  if(!options) {
    options = { encoding: enc, flag: fileMode };
  } else if(typeof options === "function") {
    options = { encoding: enc, flag: fileMode };
  } else if(typeof options === "string") {
    options = { encoding: options, flag: fileMode };
  }
  return options;
}

function pathCheck(path, callback) {
  var err;
  if(isNullPath(path)) {
    err = new Error('Path must be a string without null bytes.');
  } else if(!isAbsolutePath(path)) {
    err = new Error('Path must be absolute.');
  }

  if(err) {
    callback(err);
    return false;
  }
  return true;
}


function open(fs, context, path, flags, mode, callback) {
  // NOTE: we support the same signature as node with a `mode` arg,
  // but ignore it.
  callback = arguments[arguments.length - 1];
  if(!pathCheck(path, callback)) return;

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
      var openFileDescription = new OpenFileDescription(path, fileNode.id, flags, position);
      var fd = fs.allocDescriptor(openFileDescription);
      callback(null, fd);
    }
  }

  flags = validate_flags(flags);
  if(!flags) {
    callback(new Errors.EINVAL('flags is not valid'));
  }

  open_file(context, path, flags, check_result);
}

function close(fs, context, fd, callback) {
  if(!_(fs.openFiles).has(fd)) {
    callback(new Errors.EBADF());
  } else {
    fs.releaseDescriptor(fd);
    callback(null);
  }
}

function mknod(fs, context, path, mode, callback) {
  if(!pathCheck(path, callback)) return;
  make_node(context, path, mode, callback);
}

function mkdir(fs, context, path, mode, callback) {
  // NOTE: we support passing a mode arg, but we ignore it internally for now.
  callback = arguments[arguments.length - 1];
  if(!pathCheck(path, callback)) return;
  make_directory(context, path, standard_check_result_cb(callback));
}

function rmdir(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  remove_directory(context, path, standard_check_result_cb(callback));
}

function stat(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;

  function check_result(error, result) {
    if(error) {
      callback(error);
    } else {
      var stats = new Stats(result, fs.name);
      callback(null, stats);
    }
  }

  stat_file(context, path, check_result);
}

function fstat(fs, context, fd, callback) {
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
    callback(new Errors.EBADF());
  } else {
    fstat_file(context, ofd, check_result);
  }
}

function link(fs, context, oldpath, newpath, callback) {
  if(!pathCheck(oldpath, callback)) return;
  if(!pathCheck(newpath, callback)) return;
  link_node(context, oldpath, newpath, standard_check_result_cb(callback));
}

function unlink(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  unlink_node(context, path, standard_check_result_cb(callback));
}

function read(fs, context, fd, buffer, offset, length, position, callback) {
  // Follow how node.js does this
  function wrapped_cb(err, bytesRead) {
    // Retain a reference to buffer so that it can't be GC'ed too soon.
    callback(err, bytesRead || 0, buffer);
  }

  offset = (undefined === offset) ? 0 : offset;
  length = (undefined === length) ? buffer.length - offset : length;
  callback = arguments[arguments.length - 1];

  var ofd = fs.openFiles[fd];
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!_(ofd.flags).contains(O_READ)) {
    callback(new Errors.EBADF('descriptor does not permit reading'));
  } else {
    read_data(context, ofd, buffer, offset, length, position, standard_check_result_cb(wrapped_cb));
  }
}

function readFile(fs, context, path, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, null, 'r');

  if(!pathCheck(path, callback)) return;

  var flags = validate_flags(options.flag || 'r');
  if(!flags) {
    callback(new Errors.EINVAL('flags is not valid'));
  }

  open_file(context, path, flags, function(err, fileNode) {
    if(err) {
      return callback(err);
    }
    var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
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

function write(fs, context, fd, buffer, offset, length, position, callback) {
  callback = arguments[arguments.length - 1];
  offset = (undefined === offset) ? 0 : offset;
  length = (undefined === length) ? buffer.length - offset : length;

  var ofd = fs.openFiles[fd];
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!_(ofd.flags).contains(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else if(buffer.length - offset < length) {
    callback(new Errors.EIO('intput buffer is too small'));
  } else {
    write_data(context, ofd, buffer, offset, length, position, standard_check_result_cb(callback));
  }
}

function writeFile(fs, context, path, data, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, 'utf8', 'w');

  if(!pathCheck(path, callback)) return;

  var flags = validate_flags(options.flag || 'w');
  if(!flags) {
    callback(new Errors.EINVAL('flags is not valid'));
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
    var ofd = new OpenFileDescription(path, fileNode.id, flags, 0);
    var fd = fs.allocDescriptor(ofd);

    replace_data(context, ofd, data, 0, data.length, function(err2, nbytes) {
      if(err2) {
        return callback(err2);
      }
      fs.releaseDescriptor(fd);
      callback(null);
    });
  });
}

function appendFile(fs, context, path, data, options, callback) {
  callback = arguments[arguments.length - 1];
  options = validate_file_options(options, 'utf8', 'a');

  if(!pathCheck(path, callback)) return;

  var flags = validate_flags(options.flag || 'a');
  if(!flags) {
    callback(new Errors.EINVAL('flags is not valid'));
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
    var ofd = new OpenFileDescription(path, fileNode.id, flags, fileNode.size);
    var fd = fs.allocDescriptor(ofd);

    write_data(context, ofd, data, 0, data.length, ofd.position, function(err2, nbytes) {
      if(err2) {
        return callback(err2);
      }
      fs.releaseDescriptor(fd);
      callback(null);
    });
  });
}

function exists(fs, context, path, callback) {
  function cb(err, stats) {
    callback(err ? false : true);
  }
  stat(fs, context, path, cb);
}

function getxattr(fs, context, path, name, callback) {
  if (!pathCheck(path, callback)) return;
  getxattr_file(context, path, name, standard_check_result_cb(callback));
}

function fgetxattr(fs, context, fd, name, callback) {
  var ofd = fs.openFiles[fd];
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else {
    fgetxattr_file(context, ofd, name, standard_check_result_cb(callback));
  }
}

function setxattr(fs, context, path, name, value, flag, callback) {
  if(typeof flag === 'function') {
    callback = flag;
    flag = null;
  }

  if (!pathCheck(path, callback)) return;
  setxattr_file(context, path, name, value, flag, standard_check_result_cb(callback));
}

function fsetxattr(fs, context, fd, name, value, flag, callback) {
  if(typeof flag === 'function') {
    callback = flag;
    flag = null;
  }

  var ofd = fs.openFiles[fd];
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else if (!_(ofd.flags).contains(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  }
  else {
    fsetxattr_file(context, ofd, name, value, flag, standard_check_result_cb(callback));
  }
}

function removexattr(fs, context, path, name, callback) {
  if (!pathCheck(path, callback)) return;
  removexattr_file(context, path, name, standard_check_result_cb(callback));
}

function fremovexattr(fs, context, fd, name, callback) {
  var ofd = fs.openFiles[fd];
  if (!ofd) {
    callback(new Errors.EBADF());
  }
  else if (!_(ofd.flags).contains(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  }
  else {
    fremovexattr_file(context, ofd, name, standard_check_result_cb(callback));
  }
}

function lseek(fs, context, fd, offset, whence, callback) {
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

  var ofd = fs.openFiles[fd];
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

function readdir(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  read_directory(context, path, standard_check_result_cb(callback));
}

function utimes(fs, context, path, atime, mtime, callback) {
  if(!pathCheck(path, callback)) return;

  var currentTime = Date.now();
  atime = (atime) ? atime : currentTime;
  mtime = (mtime) ? mtime : currentTime;

  utimes_file(context, path, atime, mtime, standard_check_result_cb(callback));
}

function futimes(fs, context, fd, atime, mtime, callback) {
  var currentTime = Date.now();
  atime = (atime) ? atime : currentTime;
  mtime = (mtime) ? mtime : currentTime;

  var ofd = fs.openFiles[fd];
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!_(ofd.flags).contains(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else {
    futimes_file(context, ofd, atime, mtime, standard_check_result_cb(callback));
  }
}

function rename(fs, context, oldpath, newpath, callback) {
  if(!pathCheck(oldpath, callback)) return;
  if(!pathCheck(newpath, callback)) return;

  function unlink_old_node(error) {
    if(error) {
      callback(error);
    } else {
      unlink_node(context, oldpath, standard_check_result_cb(callback));
    }
  }

  link_node(context, oldpath, newpath, unlink_old_node);
}

function symlink(fs, context, srcpath, dstpath, type, callback) {
  // NOTE: we support passing the `type` arg, but ignore it.
  callback = arguments[arguments.length - 1];
  if(!pathCheck(srcpath, callback)) return;
  if(!pathCheck(dstpath, callback)) return;
  make_symbolic_link(context, srcpath, dstpath, standard_check_result_cb(callback));
}

function readlink(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;
  read_link(context, path, standard_check_result_cb(callback));
}

function lstat(fs, context, path, callback) {
  if(!pathCheck(path, callback)) return;

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

function truncate(fs, context, path, length, callback) {
  // NOTE: length is optional
  callback = arguments[arguments.length - 1];
  length = length || 0;

  if(!pathCheck(path, callback)) return;
  truncate_file(context, path, length, standard_check_result_cb(callback));
}

function ftruncate(fs, context, fd, length, callback) {
  // NOTE: length is optional
  callback = arguments[arguments.length - 1];
  length = length || 0;

  var ofd = fs.openFiles[fd];
  if(!ofd) {
    callback(new Errors.EBADF());
  } else if(!_(ofd.flags).contains(O_WRITE)) {
    callback(new Errors.EBADF('descriptor does not permit writing'));
  } else {
    ftruncate_file(context, ofd, length, standard_check_result_cb(callback));
  }
}

module.exports = {
  makeRootDirectory: make_root_directory,
  open: open,
  close: close,
  mknod: mknod,
  mkdir: mkdir,
  rmdir: rmdir,
  unlink: unlink,
  stat: stat,
  fstat: fstat,
  link: link,
  read: read,
  readFile: readFile,
  write: write,
  writeFile: writeFile,
  appendFile: appendFile,
  exists: exists,
  getxattr: getxattr,
  fgetxattr: fgetxattr,
  setxattr: setxattr,
  fsetxattr: fsetxattr,
  removexattr: removexattr,
  fremovexattr: fremovexattr,
  lseek: lseek,
  readdir: readdir,
  utimes: utimes,
  futimes: futimes,
  rename: rename,
  symlink: symlink,
  readlink: readlink,
  lstat: lstat,
  truncate: truncate,
  ftruncate: ftruncate
};
