var O_READ = 'READ';
var O_WRITE = 'WRITE';
var O_CREATE = 'CREATE';
var O_EXCLUSIVE = 'EXCLUSIVE';
var O_TRUNCATE = 'TRUNCATE';
var O_APPEND = 'APPEND';
var XATTR_CREATE = 'CREATE';
var XATTR_REPLACE = 'REPLACE';

module.exports = {
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
  FS_NODUPEIDCHECK: 'FS_NODUPEIDCHECK',

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

  // Reserved File Descriptors for streams
  STDIN: 0,
  STDOUT: 1,
  STDERR: 2,
  FIRST_DESCRIPTOR: 3,

  ENVIRONMENT: {
    TMP: '/tmp',
    PATH: ''
  },

  /**
   * Plan 9 related
   *  - https://github.com/chaos/diod/blob/master/libnpfs/9p.h
   *  - https://en.wikibooks.org/wiki/C_Programming/POSIX_Reference/sys/stat.h
   */
  P9: {
    /**
    * QID types
    * 
    * @P9_QTDIR: directory
    * @P9_QTAPPEND: append-only
    * @P9_QTEXCL: excluse use (only one open handle allowed)
    * @P9_QTMOUNT: mount points
    * @P9_QTAUTH: authentication file
    * @P9_QTTMP: non-backed-up files
    * @P9_QTSYMLINK: symbolic links (9P2000.u)
    * @P9_QTLINK: hard-link (9P2000.u)
    * @P9_QTFILE: normal files
    */
    QTDIR: 0x80,
    QTAPPEND: 0x40,
    QTEXCL: 0x20,
    QTMOUNT: 0x10,
    QTAUTH: 0x08,
    QTTMP: 0x04,
    QTSYMLINK: 0x02,
    QTLINK: 0x01,
    QTFILE: 0x00,

    /**
     * POSIX System Values
     */
    S_IFMT: 0xF000, // mask for file type 
    S_IFLNK: 0xA000, // symbolic link
    S_IFDIR: 0x4000, // directory
    S_IFREG: 0x8000 // regular file
  }
};
