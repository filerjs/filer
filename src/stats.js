'use strict';
const Constants = require('./constants.js');
const Path = require('./path.js');

// https://github.com/nodejs/node/blob/4f1297f259b09d129ac01afbd4c674263b7ac124/lib/internal/fs/utils.js#L231
function dateFromNumeric(num) {
  return new Date(Number(num) * 1000);
}

function Stats(path, fileNode, devName) {
  this.dev = devName;
  this.node = fileNode.id;
  this.type = fileNode.type;
  this.size = fileNode.size;
  this.nlinks = fileNode.nlinks;
  // Date objects
  this.atime = dateFromNumeric(fileNode.atime);
  this.mtime = dateFromNumeric(fileNode.mtime);
  this.ctime = dateFromNumeric(fileNode.ctime);
  // Unix timestamp Numbers
  this.atimeMs = fileNode.atime;
  this.mtimeMs = fileNode.mtime;
  this.ctimeMs = fileNode.ctime;
  this.version = fileNode.version;
  this.mode = fileNode.mode;
  this.uid = fileNode.uid;
  this.gid = fileNode.gid;
  this.name = Path.basename(path);
}

Stats.prototype.isFile = function() {
  return this.type === Constants.NODE_TYPE_FILE;
};

Stats.prototype.isDirectory = function() {
  return this.type === Constants.NODE_TYPE_DIRECTORY;
};

Stats.prototype.isSymbolicLink = function() {
  return this.type === Constants.NODE_TYPE_SYMBOLIC_LINK;
};

// These will always be false in Filer.
Stats.prototype.isSocket          =
Stats.prototype.isFIFO            =
Stats.prototype.isCharacterDevice =
Stats.prototype.isBlockDevice     =
function() {
  return false;
};

module.exports = Stats;
