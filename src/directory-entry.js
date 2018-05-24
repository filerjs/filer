var NODE_TYPE_FILE = require('./constants.js').NODE_TYPE_FILE;

module.exports = function DirectoryEntry(id, type) {
  this.id = id;
  this.type = type || NODE_TYPE_FILE;
};
