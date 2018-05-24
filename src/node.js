var path = require('./path.js');
var hash32 = require('./encoding.js').hash32;

var NODE_TYPE_FILE = require('./constants.js').NODE_TYPE_FILE;
var NODE_TYPE_DIRECTORY = require('./constants.js').NODE_TYPE_DIRECTORY;
var NODE_TYPE_SYMBOLIC_LINK = require('./constants.js').NODE_TYPE_SYMBOLIC_LINK;
var NODE_TYPE_META = require('./constants.js').NODE_TYPE_META;

var ROOT_DIRECTORY_NAME = require('./constants.js').ROOT_DIRECTORY_NAME;

// Name of file/dir. Must be '/' if the file is the root directory of the server
function pathToName(pathName) {
  return pathName === ROOT_DIRECTORY_NAME ? ROOT_DIRECTORY_NAME : path.basename(pathName);
}

function Node(options) {
  var now = Date.now();

  this.id = options.id;
  this.type = options.type || NODE_TYPE_FILE;  // node type (file, directory, etc)
  this.name = options.name || (pathToName(options.path));
  this.size = options.size || 0; // size (bytes for files, entries for directories)
  this.atime = options.atime || now; // access time (will mirror ctime after creation)
  this.ctime = options.ctime || now; // creation/change time
  this.mtime = options.mtime || now; // modified time
  this.flags = options.flags || []; // file flags
  this.xattrs = options.xattrs || {}; // extended attributes
  this.nlinks = options.nlinks || 0; // links count
  this.data = options.data; // id for data object
  this.version = options.version || 1;

  // permissions and flags
  this.mode = options.mode || (this.type === NODE_TYPE_DIRECTORY ? /* 755 */ 493 : /* 644 */ 420);
  this.uid = options.uid || 0x0; // owner name
  this.gid = options.gid || 0x0; // group name
}

// When the node's path changes, update info that relates to it.
Node.prototype.updatePathInfo = function(newPath) {
  this.name = pathToName(newPath);
};

// Make sure the options object has an id on property,
// either from caller or one we generate using supplied guid fn.
function ensureID(options, prop, callback) {
  if(options[prop]) {
    callback(null);
  } else {
    options.guid(function(err, id) {
      options[prop] = id;
      callback(err);
    });
  }
}

Node.create = function(options, callback) {
  // We expect both options.id and options.data to be provided/generated.
  ensureID(options, 'id', function(err) {
    if(err) {
      callback(err);
      return;
    }

    ensureID(options, 'data', function(err) {
      if(err) {
        callback(err);
        return;
      }

      callback(null, new Node(options));
    });
  });
};

Node.fromObject = function(object) {
  return new Node({
    id: object.id,
    type: object.type,
    name: object.name,
    size: object.size,
    atime: object.atime,
    ctime: object.ctime,
    mtime: object.mtime,
    flags: object.flags,
    xattrs: object.xattrs,
    nlinks: object.nlinks,
    data: object.data,
    mode: object.mode,
    uid: object.uid,
    gid: object.gid,
    version: object.version
  });
};

module.exports = Node;
