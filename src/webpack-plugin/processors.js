const ROOT_DIR_TAG = '<rootDir>';
const CWD = process.cwd();

module.exports = {
  filerDir: {
    process: function(value) {
      if (!value) {
        return path.join(CWD, 'node_modules', 'filer');
      }
      return value.replace(ROOT_DIR_TAG, CWD);
    },
  },
  shimsDir: {
    process: function(value) {
      if (!value) {
        return path.join(CWD, 'node_modules', 'filer', 'shims');
      }
      return value.replace(ROOT_DIR_TAG, CWD);
    }
  },
  shimFs: { default: true },
  shimPath: { default: true},
  shimBuffer: { default: true},
  fsProvider: { default: 'default'},
  fsProviderDir: {
    process: function(value) {
      if (!value) {
        return path.join(CWD, 'node_modules', 'filer', 'shims', 'providers');
      }
      return value.replace(ROOT_DIR_TAG, CWD);
    },
  },
};
