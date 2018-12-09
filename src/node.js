const {
  NODE_TYPE_FILE,
  NODE_TYPE_DIRECTORY,
  NODE_TYPE_SYMBOLIC_LINK,
  DEFAULT_FILE_PERMISSIONS,
  DEFAULT_DIR_PERMISSIONS
} = require('./constants');
const {
  S_IFREG,
  S_IFDIR,
  S_IFLNK
} = require('./constants').fsConstants;

/**
 * Make sure the options object has an id on property,
 * either from caller or one we generate using supplied guid fn.
 */
function ensureID(options, prop, callback) {
  if(options[prop]) {
    return callback();
  }

  options.guid(function(err, id) {
    if(err) {
      return callback(err);
    }
    options[prop] = id;
    callback();
  });
}

/**
 * Generate a POSIX mode (integer) for the node type and permissions.
 * Use default permissions if we aren't passed any.
 */
function generateMode(nodeType, modePermissions) {
  switch(nodeType) {
  case NODE_TYPE_DIRECTORY:
    return (modePermissions || DEFAULT_DIR_PERMISSIONS) | S_IFDIR;
  case NODE_TYPE_SYMBOLIC_LINK:
    return (modePermissions || DEFAULT_FILE_PERMISSIONS) | S_IFLNK;
  case NODE_TYPE_FILE:
    // falls through
  default:
    return (modePermissions || DEFAULT_FILE_PERMISSIONS) | S_IFREG;
  }
}

/**
 * Common properties for the layout of a Node
 */
class Node {
  constructor(options) {
    var now = Date.now();

    this.id = options.id;
    this.data = options.data; // id for data object
    this.size = options.size || 0; // size (bytes for files, entries for directories)
    this.atime = options.atime || now; // access time (will mirror ctime after creation)
    this.ctime = options.ctime || now; // creation/change time
    this.mtime = options.mtime || now; // modified time
    this.flags = options.flags || []; // file flags
    this.xattrs = options.xattrs || {}; // extended attributes
    this.nlinks = options.nlinks || 0; // links count

    // Historically, Filer's node layout has referred to the
    // node type as `mode`, and done so using a String.  In
    // a POSIX filesystem, the mode is a number that combines
    // both node type and permission bits. Internal we use `type`,
    // but store it in the database as `mode` for backward
    // compatibility.
    if(typeof options.type === 'string') {
      this.type = options.type;
    } else if(typeof options.mode === 'string') {
      this.type = options.mode;
    } else {
      this.type = NODE_TYPE_FILE;
    }

    // Extra mode permissions and ownership info
    this.permissions = options.permissions || generateMode(this.type);
    this.uid = options.uid || 0x0; // owner name
    this.gid = options.gid || 0x0; // group name
  }

  /**
   * Serialize a Node to JSON.  Everything is as expected except
   * that we use `mode` for `type` to maintain backward compatibility.
   */
  toJSON() {
    return {
      id: this.id,
      data: this.data,
      size: this.size,
      atime: this.atime,
      ctime: this.ctime,
      mtime: this.ctime,
      flags: this.flags,
      xattrs: this.xattrs,
      nlinks: this.nlinks,
      // Use `mode` for `type` to keep backward compatibility
      mode: this.type,
      permissions: this.permissions,
      uid: this.uid,
      gid: this.gid
    };
  }

  // Return complete POSIX `mode` for node type + permissions. See:
  // http://man7.org/linux/man-pages/man2/chmod.2.html
  get mode() {
    return generateMode(this.type, this.permissions);
  }
  // When setting the `mode` we assume permissions bits only (not changing type)
  set mode(value) {
    this.permissions = value;
  }
}

module.exports.create = function create(options, callback) {
  // We expect both options.id and options.data to be provided/generated.
  ensureID(options, 'id', function(err) {
    if(err) {
      return callback(err);
    }

    ensureID(options, 'data', function(err) {
      if(err) {
        return callback(err);
      }

      callback(null, new Node(options));
    });
  });
};
