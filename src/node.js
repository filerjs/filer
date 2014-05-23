var MODE_FILE = require('./constants.js').MODE_FILE;
var guid = require('./shared.js').guid;

module.exports = function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, nlinks, version) {
  var now = Date.now();

  this.id = id || guid();
  this.mode = mode || MODE_FILE;  // node type (file, directory, etc)
  this.size = size || 0; // size (bytes for files, entries for directories)
  this.atime = atime || now; // access time (will mirror ctime after creation)
  this.ctime = ctime || now; // creation/change time
  this.mtime = mtime || now; // modified time
  this.flags = flags || []; // file flags
  this.xattrs = xattrs || {}; // extended attributes
  this.nlinks = nlinks || 0; // links count
  this.version = version || 0; // node version
  this.blksize = undefined; // block size
  this.nblocks = 1; // blocks count
  this.data = guid(); // id for data object
};
