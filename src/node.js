var MODE_FILE = require('./constants.js').MODE_FILE;

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
}

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

module.exports = Node;
