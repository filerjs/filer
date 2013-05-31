define(function(require) {

  var MODE_FILE = require('src/constants').MODE_FILE;

  var guid = require('src/shared').guid;
  var hash = require('src/shared').hash;

  function Node(id, mode, size, atime, ctime, mtime, flags, xattrs, links, version) {
    var now = Date.now();

    this.id = id || hash(guid()),
    this.mode = mode || MODE_FILE;  // node type (file, directory, etc)
    this.size = size || 0; // size (bytes for files, entries for directories)
    this.atime = atime || now; // access time
    this.ctime = ctime || now; // creation time
    this.mtime = mtime || now; // modified time
    this.flags = flags || ''; // file flags
    this.xattrs = xattrs || {}; // extended attributes
    this.links = links || 0; // links count
    this.version = version || 0; // node version
    this.data = hash(id) // id for data object
  };

  return {
    Node: Node,
  };

});