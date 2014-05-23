var MODE_FILE = require('./constants.js').MODE_FILE;

module.exports = function DirectoryEntry(id, type) {
  this.id = id;
  this.type = type || MODE_FILE;
};
