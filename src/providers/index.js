const IndexedDB = require('./indexeddb.js');
const Memory = require('./memory.js');

module.exports = {
  IndexedDB: IndexedDB,
  Default: IndexedDB,
  Memory: Memory
};
