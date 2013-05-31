define(function(require) {

  return {
    METADATA_STORE_NAME: 'metadata',
    FILE_STORE_NAME: 'files',

    IDB_RO: 'readonly',
    IDB_RW: 'readwrite',

    MODE_FILE: 'FILE',
    MODE_DIRECTORY: 'DIRECTORY',
    MODE_SYMBOLIC_LINK: 'SYMLINK',

    BINARY_MIME_TYPE: 'application/octet-stream',
    JSON_MIME_TYPE: 'application/json',

    ROOT_DIRECTORY_NAME: '/', // basename(normalize(path))
    ROOT_NODE_ID: '8a5edab282632443219e051e4ade2d1d5bbc671c781051bf1437897cbdfea0f1', // sha256(ROOT_DIRECTORY_NAME)

  // FileSystem flags
    FS_FORMAT: 'FORMAT',

  // Open flags
    O_READONLY: 'READONLY',
    O_READWRITE: 'READWRITE',
    O_APPEND: 'APPEND',
    O_CREATE: 'CREATE',
    O_TRUNCATE: 'TRUNCATE',

  // FileSystem readyState
    FS_READY: 'READY',
    FS_PENDING: 'PENDING',
    FS_ERROR: 'ERROR',
  };

});