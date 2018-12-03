/**
 * Patch process to add process.cwd(), always giving the root dir.
 * NOTE: this line needs to happen *before* we require in `path`.
 */
process.cwd = () => '/';

/**
 * https://github.com/browserify/path-browserify via Parcel.
 * We use is as a base for our own Filer.Path, and patch/add
 * a few things we need for the browser environment.
 */
const nodePath = require('path');
const filerPath = Object.create(nodePath);

/**
 * Patch path.basename() to return / vs. ''
 */
filerPath.basename = (path, ext) => {
  const basename = nodePath.basename(path, ext);
  return basename === '' ? '/' : basename;
};

/**
 * Patch path.normalize() to not add a trailing /
 */
filerPath.normalize = (path) => {
  path = nodePath.normalize(path);
  return path === '/' ? path : filerPath.removeTrailing(path);
};

/**
 * Add new utility method isNull() to path: check for null paths.
 */
filerPath.isNull = path => ('' + path).indexOf('\u0000') !== -1;

/**
 * Add new utility method addTrailing() to add trailing / without doubling to //.
 */
filerPath.addTrailing = path => path.replace(/\/*$/, '/');

/**
 * Add new utility method removeTrailing() to remove trailing /, dealing with multiple
 */
filerPath.removeTrailing = path => {
  path = path.replace(/\/*$/, '');
  return path === '' ? '/' : path;
};

module.exports = filerPath;
