var path = require('./path.js');
var hash32 = require('./encoding.js').hash32;

var MODE_FILE = require('./constants.js').MODE_FILE;
var MODE_DIRECTORY = require('./constants.js').MODE_DIRECTORY;
var MODE_SYMBOLIC_LINK = require('./constants.js').MODE_SYMBOLIC_LINK;
var MODE_META = require('./constants.js').MODE_META;

var P9_QTFILE = require('./constants.js').P9.QTFILE;
var P9_QTDIR = require('./constants.js').P9.QTDIR;
var P9_QTSYMLINK = require('./constants.js').P9.QTSYMLINK;

var S_IFLNK = require('./constants.js').P9.S_IFLNK;
var S_IFDIR = require('./constants.js').P9.S_IFDIR;
var S_IFREG = require('./constants.js').P9.S_IFREG;

var ROOT_DIRECTORY_NAME = require('./constants.js').ROOT_DIRECTORY_NAME;

function getQType(mode) {
  switch(mode) {
    case MODE_FILE:
      return P9_QTFILE;
    case MODE_DIRECTORY:
      return P9_QTDIR;
    case MODE_SYMBOLIC_LINK:
      return P9_QTSYMLINK;
    default:
      return null;
  }
}

function getPOSIXMode(mode) {
  switch(mode) {
    case MODE_FILE:
      return S_IFREG;
    case MODE_DIRECTORY:
      return S_IFDIR;
    case MODE_SYMBOLIC_LINK:
      return S_IFLNK;
    default:
      return null;
  }
}

function Node(options) {
  var now = Date.now();

  this.id = options.id;
  this.mode = options.mode || MODE_FILE;  // node type (file, directory, etc)
  this.size = options.size || 0; // size (bytes for files, entries for directories)
  this.atime = options.atime || now; // access time (will mirror ctime after creation)
  this.ctime = options.ctime || now; // creation/change time
  this.mtime = options.mtime || now; // modified time
  this.flags = options.flags || []; // file flags
  this.xattrs = options.xattrs || {}; // extended attributes
  this.nlinks = options.nlinks || 0; // links count
  this.version = options.version || 0; // node version
  this.blksize = undefined; // block size
  this.nblocks = 1; // blocks count
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

  options.p9 = options.p9 || {qid: {}};

  this.p9 = {
    qid: {
      type: options.p9.qid.type || (getQType(this.mode) || P9_QTFILE),
      // use mtime for version info, since we already keep that updated
      version: options.p9.qid.now || now,
      // files have a unique `path` number, which takes into account files with same
      // name but created at different times.
      path: options.p9.qid.path || hash32(options.path + this.ctime)
    },
    // permissions and flags
    // TODO: I don't think I'm doing this correctly yet...
    mode: options.p9.mode || (getPOSIXMode(this.mode) || S_IFREG),
    // Name of file/dir. Must be / if the file is the root directory of the server
    // TODO: do I need this or can I derive it from abs path?
    name: options.p9.name || (options.path === ROOT_DIRECTORY_NAME ? ROOT_DIRECTORY_NAME : path.basename(options.path)),
    uid: options.p9.uid || 0x0, // owner name
    gid: options.p9.gid || 0x0, // group name
    muid: options.p9.muid || 0x0 // name of the user who last modified the file 
  };
}

// When the node's path changes, update info that relates to it.
Node.prototype.updatePathInfo = function(newPath, ctime) {
  // XXX: need to confirm that qid's path actually changes on rename.
  this.p9.qid.path = hash32(newPath + (ctime || this.ctime));
  this.p9.name = newPath === ROOT_DIRECTORY_NAME ? ROOT_DIRECTORY_NAME : path.basename(newPath);
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
    mode: object.mode,
    size: object.size,
    atime: object.atime,
    ctime: object.ctime,
    mtime: object.mtime,
    flags: object.flags,
    xattrs: object.xattrs,
    nlinks: object.nlinks,
    data: object.data,
    p9: {
      qid: {
        type: object.p9.qid.type,
        version: object.p9.qid.version,
        path: object.p9.qid.path
      },
      mode: object.p9.mode,
      name: object.p9.name,
      uid: object.p9.uid,
      gid: object.p9.gid,
      muid: object.p9.muid 
    }
  });
};

module.exports = Node;
