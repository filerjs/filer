var NODE_TYPE_FILE = require('./constants.js').NODE_TYPE_FILE;
var NODE_TYPE_DIRECTORY = require('./constants.js').NODE_TYPE_DIRECTORY;
var NODE_TYPE_SYMBOLIC_LINK = require('./constants.js').NODE_TYPE_SYMBOLIC_LINK;

var S_IFREG = require('./constants.js').S_IFREG;
var S_IFDIR = require('./constants.js').S_IFDIR;
var S_IFLNK = require('./constants.js').S_IFLNK;

var DEFAULT_FILE_PERMISSIONS = require('./constants.js').DEFAULT_FILE_PERMISSIONS;
var DEFAULT_DIR_PERMISSIONS = require('./constants.js').DEFAULT_DIR_PERMISSIONS;

function getMode(type, mode) {
  switch(type) {
  case NODE_TYPE_DIRECTORY:
    return (mode || DEFAULT_DIR_PERMISSIONS) | S_IFDIR;
  case NODE_TYPE_SYMBOLIC_LINK:
    return (mode || DEFAULT_FILE_PERMISSIONS) | S_IFLNK;
    /* jshint -W086 */
  case NODE_TYPE_FILE:
    // falls through
  default:
    return (mode || DEFAULT_FILE_PERMISSIONS) | S_IFREG;
  }
}

function Node(options) {
  var now = Date.now();

  this.id = options.id;
  this.type = options.type || NODE_TYPE_FILE;  // node type (file, directory, etc)
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
  this.mode = options.mode || (getMode(this.type));
  this.uid = options.uid || 0x0; // owner name
  this.gid = options.gid || 0x0; // group name
}

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

// Update the node's mode (permissions), taking file type bits into account.
Node.setMode = function(mode, node) {
  node.mode = getMode(node.type, mode);
};

module.exports = Node;
