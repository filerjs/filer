import E from "./errors";

function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
      /^(\/?)([\s\S]+\/(?!$)|\/)?((?:\.{1,2}$|[\s\S]+?)?(\.[^.\/]*)?)$/;
var splitPath = function(filename) {
  var result = splitPathRe.exec(filename);
  return [result[1] || '', result[2] || '', result[3] || '', result[4] || ''];
};

// path.resolve([from ...], to)
export function resolve() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    // XXXfiler: we don't have process.cwd() so we use '/' as a fallback
    var path = (i >= 0) ? arguments[i] : '/';

    // Skip empty and invalid entries
    if (typeof path !== 'string' || !path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(resolvedPath.split('/').filter(function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
}

// path.normalize(path)
export function normalize(path) {
  var isAbsolute = path.charAt(0) === '/',
      trailingSlash = path.substr(-1) === '/';

  // Normalize the path
  path = normalizeArray(path.split('/').filter(function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  /*
   if (path && trailingSlash) {
   path += '/';
   }
   */

  return (isAbsolute ? '/' : '') + path;
}

export function join() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return normalize(paths.filter(function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
}

// path.relative(from, to)
export function relative(from, to) {
  from = resolve(from).substr(1);
  to = resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
}

export function dirname(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
}

export function basename(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  // XXXfiler: node.js just does `return f`
  return f === "" ? "/" : f;
}

export function extname(path) {
  return splitPath(path)[3];
}

export function isAbsolute(path) {
  if(path.charAt(0) === '/') {
    return true;
  }
  return false;
}

export function isNull(path) {
  if (('' + path).indexOf('\u0000') !== -1) {
    return true;
  }
  return false;
}

// Make sure we don't double-add a trailing slash (e.g., '/' -> '//')
export function addTrailing(path) {
  return path.replace(/\/*$/, '/');
}

// Deal with multiple slashes at the end, one, or none
// and make sure we don't return the empty string.
export function removeTrailing(path) {
  path = path.replace(/\/*$/, '');
  return path === '' ? '/' : path;
}

export function check(path) {
  if(!path) {
    throw new E.EINVAL('path must be a string', path);
  } else if(isNull(path)) {
    throw new E.EINVAL('path must be a string without null bytes', path);
  } else if(!isAbsolute(path)) {
    throw new E.EINVAL('path must be absolute', path);
  }
}