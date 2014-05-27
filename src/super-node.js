var Constants = require('./constants.js');
var guid = require('./shared.js').guid;

module.exports = function SuperNode(atime, ctime, mtime) {
  var now = Date.now();

  this.id = Constants.SUPER_NODE_ID;
  this.mode = Constants.MODE_META;
  this.atime = atime || now;
  this.ctime = ctime || now;
  this.mtime = mtime || now;
  this.rnode = guid(); // root node id (randomly generated)
};
