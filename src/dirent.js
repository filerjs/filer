'use strict';

const Stats = require('./stats.js');

function Dirent(path, fileNode, devName) {
  this.constructor = Dirent;
  Stats.call(this, path, fileNode, devName);
}

Dirent.prototype = Stats.prototype;

module.exports = Dirent;
