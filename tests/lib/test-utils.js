var Filer = require('../../src');
var IndexedDBTestProvider = require('./indexeddb.js');
var MemoryTestProvider = require('./memory.js');
var Url = require('url');

var _provider;
var _fs;

function uniqueName() {
  if(!uniqueName.seed) {
    uniqueName.seed = Date.now();
  }
  return 'filer-testdb-' + uniqueName.seed++;
}

function findBestProvider() {
  var providers = Filer.FileSystem.providers;
  return providers.IndexedDB.isSupported() ?
    IndexedDBTestProvider : MemoryTestProvider;
}

function getUrlParams() {
  // Check if we are running in node
  if(!global.location) {
    return null;
  }

  var url = Url.parse(global.location.href, true);

  return url.query;
}

function getProviderType() {
  var defaultProvider = 'default';
  var queryString = getUrlParams();

  // If the environment is node or the query string is empty,
  // the memory provider will be used.
  if(!queryString) {
    return defaultProvider;
  }

  return queryString['filer-provider'] || defaultProvider;
}

// Run fn() in an environment with indexedDB available
// either as-is, or shimmed, removing when done.
function shimIndexedDB(fn) {
  var addShim = !Filer.FileSystem.providers.IndexedDB.isSupported();

  if(addShim) {
    global.indexedDB = require('fake-indexeddb');
  }

  fn();

  if(addShim) {
    delete global.indexedDB;
  }
}

function setup(callback) {
  // In browser we support specifying the provider via the query string
  // (e.g., ?filer-provider=IndexedDB). If not specified, we use
  // the Memory provider by default.
  var providerType = getProviderType();

  var name = uniqueName();

  switch(providerType.toLowerCase()) {
  case 'indexeddb':
    _provider = new IndexedDBTestProvider(name);
    break;
  case 'memory':
    _provider = new MemoryTestProvider(name);
    break;
  case 'default':
  default:
    var BestProvider = findBestProvider();
    _provider = new BestProvider(name);
    break;
  }

  // Allow passing FS flags on query string
  var flags = global.filerArgs && global.filerArgs.flags ?
    global.filerArgs.flags : 'FORMAT';

  // Create a file system and wait for it to get setup
  _provider.init();

  function complete(err, fs) {
    if(err) throw err;
    _fs = fs;
    callback();
  }
  return new Filer.FileSystem({
    name: name,
    provider: _provider.provider,
    flags: flags
  }, complete);
}

function fs() {
  if(!_fs) {
    throw new Error('TestUtil: call setup() before fs()');
  }
  return _fs;
}

function provider() {
  if(!_provider) {
    throw new Error('TestUtil: call setup() before provider()');
  }
  return _provider;
}

function shell(options) {
  var _fs = fs();
  return new _fs.Shell(options);
}

function cleanup(callback) {
  if(!_provider) {
    return;
  }
  _provider.cleanup(function() {
    _provider = null;
    _fs = null;
    callback();
  });
}

function typedArrayEqual(a, b) {
  if(!(a && b)) {
    return false;
  }
  if(a.length !== b.length) {
    return false;
  }

  for(var i = 0; i < a.length; ++ i) {
    if(a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Parse JSON with serialized Buffers
 */
const parseBJSON = json =>
  JSON.parse(json, (key, value) =>
    value && value.type === 'Buffer' ?
      Buffer.from(value.data) :
      value
  );

module.exports = {
  uniqueName: uniqueName,
  setup: setup,
  fs: fs,
  shell: shell,
  provider: provider,
  providers: {
    IndexedDB: IndexedDBTestProvider,
    Memory: MemoryTestProvider
  },
  cleanup: cleanup,
  typedArrayEqual: typedArrayEqual,
  parseBJSON,
  shimIndexedDB
};
