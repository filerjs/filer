define(function(require) {

  var O_READ = 'READ';
  var O_WRITE = 'WRITE';
  var O_CREATE = 'CREATE';
  var O_EXCLUSIVE = 'EXCLUSIVE';
  var O_TRUNCATE = 'TRUNCATE';
  var O_APPEND = 'APPEND';
  var XATTR_CREATE = 'CREATE';
  var XATTR_REPLACE = 'REPLACE';

  return {
    FILE_SYSTEM_NAME: 'local',

    FILE_STORE_NAME: 'files',

    IDB_RO: 'readonly',
    IDB_RW: 'readwrite',

    WSQL_VERSION: "1",
    WSQL_SIZE: 5 * 1024 * 1024,
    WSQL_DESC: "FileSystem Storage",

    MODE_FILE: 'FILE',
    MODE_DIRECTORY: 'DIRECTORY',
    MODE_SYMBOLIC_LINK: 'SYMLINK',
    MODE_META: 'META',

    SYMLOOP_MAX: 10,

    BINARY_MIME_TYPE: 'application/octet-stream',
    JSON_MIME_TYPE: 'application/json',

    ROOT_DIRECTORY_NAME: '/', // basename(normalize(path))

    // FS Mount Flags
    FS_FORMAT: 'FORMAT',
    FS_NOCTIME: 'NOCTIME',
    FS_NOMTIME: 'NOMTIME',

    // FS File Open Flags
    O_READ: O_READ,
    O_WRITE: O_WRITE,
    O_CREATE: O_CREATE,
    O_EXCLUSIVE: O_EXCLUSIVE,
    O_TRUNCATE: O_TRUNCATE,
    O_APPEND: O_APPEND,

    O_FLAGS: {
      'r': [O_READ],
      'r+': [O_READ, O_WRITE],
      'w': [O_WRITE, O_CREATE, O_TRUNCATE],
      'w+': [O_WRITE, O_READ, O_CREATE, O_TRUNCATE],
      'wx': [O_WRITE, O_CREATE, O_EXCLUSIVE, O_TRUNCATE],
      'wx+': [O_WRITE, O_READ, O_CREATE, O_EXCLUSIVE, O_TRUNCATE],
      'a': [O_WRITE, O_CREATE, O_APPEND],
      'a+': [O_WRITE, O_READ, O_CREATE, O_APPEND],
      'ax': [O_WRITE, O_CREATE, O_EXCLUSIVE, O_APPEND],
      'ax+': [O_WRITE, O_READ, O_CREATE, O_EXCLUSIVE, O_APPEND]
    },

    XATTR_CREATE: XATTR_CREATE,
    XATTR_REPLACE: XATTR_REPLACE,

    FS_READY: 'READY',
    FS_PENDING: 'PENDING',
    FS_ERROR: 'ERROR',

    SUPER_NODE_ID: '00000000-0000-0000-0000-000000000000',

    ENVIRONMENT: {
      TMP: '/tmp',
      PATH: ''
    }
  };

});