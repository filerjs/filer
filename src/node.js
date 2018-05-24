var path = require('./path.js');
var hash32 = require('./encoding.js').hash32;

var NODE_TYPE_FILE = require('./constants.js').NODE_TYPE_FILE;
var NODE_TYPE_DIRECTORY = require('./constants.js').NODE_TYPE_DIRECTORY;
var NODE_TYPE_SYMBOLIC_LINK = require('./constants.js').NODE_TYPE_SYMBOLIC_LINK;
var NODE_TYPE_META = require('./constants.js').NODE_TYPE_META;

var P9_QTFILE = require('./constants.js').P9.QTFILE;
var P9_QTDIR = require('./constants.js').P9.QTDIR;
var P9_QTSYMLINK = require('./constants.js').P9.QTSYMLINK;

var S_IFLNK = require('./constants.js').P9.S_IFLNK;
var S_IFDIR = require('./constants.js').P9.S_IFDIR;
var S_IFREG = require('./constants.js').P9.S_IFREG;

var ROOT_DIRECTORY_NAME = require('./constants.js').ROOT_DIRECTORY_NAME;

function getQType(type) {
  switch(type) {
    case NODE_TYPE_FILE:
      return P9_QTFILE;
    case NODE_TYPE_DIRECTORY:
      return P9_QTDIR;
    case NODE_TYPE_SYMBOLIC_LINK:
      return P9_QTSYMLINK;
    default:
      return P9_QTFILE;
  }
}

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

  /**
   * Plan 9 related metadata:
   * https://web.archive.org/web/20170601072902/http://plan9.bell-labs.com/magic/man2html/5/0intro
   * 
   * "The qid represents the server's unique identification for the file being
   * accessed: two files on the same server hierarchy are the same if and only
   * if their qids are the same. (The client may have multiple fids pointing to
   * a single file on a server and hence having a single qid.) The thirteen–byte
   * qid fields hold a one–byte type, specifying whether the file is a directory,
   * append–only file, etc., and two unsigned integers: first the four–byte qid
   * version, then the eight–byte qid path. The path is an integer unique among
   * all files in the hierarchy. If a file is deleted and recreated with the same
   * name in the same directory, the old and new path components of the qids
   * should be different. The version is a version number for a file; typically,
   * it is incremented every time the file is modified."
   */
  this.qid_type = options.qid_type || (getQType(this.type));
  this.qid_version = options.qid_version || 1;
  this.qid_path = options.qid_path || hash32(options.path + this.qid_version);

  // permissions and flags
  this.mode = options.mode || (this.type === NODE_TYPE_DIRECTORY ? /* 755 */ 493 : /* 644 */ 420);
  this.uid = options.uid || 0x0; // owner name
  this.gid = options.gid || 0x0; // group name
}

// When the node's path changes, update info that relates to it.
Node.prototype.updatePathInfo = function(newPath) {
  // XXX: need to confirm that qid's path actually changes on rename.
  this.qid_path = hash32(newPath + this.qid_version);
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
    qid_type: object.qid_type,
    qid_version: object.qid_version,
    qid_path: object.qid_path
  });
};

module.exports = Node;
