define(["Filer", "tests/lib/indexeddb", "tests/lib/websql", "tests/lib/memory"],
function(Filer, IndexedDBTestProvider, WebSQLTestProvider, MemoryTestProvider) {

  var _provider;
  var _fs;

  function uniqueName() {
    if(!uniqueName.seed) {
      uniqueName.seed = Date.now();
    }
    return 'filer-testdb-' + uniqueName.seed++;
  }

  function findBestProvider() {
    if(typeof module !== 'undefined' && module.exports) {
      return MemoryTestProvider;
    }

    // When running tests, and when no explicit provider is defined,
    // prefer providers in this order: IndexedDB, WebSQL, Memory.
    // However, if we're running in PhantomJS, use Memory first.
    if(typeof navigator !== 'undefined' && navigator.userAgent.indexOf('PhantomJS') > -1) {
      return MemoryTestProvider;
    }

    var providers = Filer.FileSystem.providers;
    if(providers.IndexedDB.isSupported()) {
      return IndexedDBTestProvider;
    }
    if(providers.WebSQL.isSupported()) {
      return WebSQLTestProvider;
    }
    return MemoryTestProvider;
  }

  function setup(callback) {
    // We support specifying the provider via the query string
    // (e.g., ?filer-provider=IndexedDB). If not specified, we use
    // the Memory provider by default.  See test/require-config.js
    // for definition of window.filerArgs.
    var providerType = (typeof window !== 'undefined' &&
      window.filerArgs && window.filerArgs.provider) ?
      window.filerArgs.provider : 'Memory';

    var name = uniqueName();

    switch(providerType.toLowerCase()) {
      case 'indexeddb':
        _provider = new IndexedDBTestProvider(name);
        break;
      case 'websql':
        _provider = new WebSQLTestProvider(name);
        break;
      case 'memory':
      /* falls through */
      default:
        var BestProvider = findBestProvider();
        _provider = new BestProvider(name);
        break;
    }

    // Allow passing FS flags on query string
    var flags = (typeof window !== 'undefined' &&
      window && window.filerArgs && window.filerArgs.flags) ?
      window.filerArgs.flags : 'FORMAT';

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
      throw "TestUtil: call setup() before fs()";
    }
    return _fs;
  }

  function provider() {
    if(!_provider) {
      throw "TestUtil: call setup() before provider()";
    }
    return _provider;
  }

  function shell(options) {
    return fs().Shell(options);
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

  return {
    uniqueName: uniqueName,
    setup: setup,
    fs: fs,
    shell: shell,
    provider: provider,
    providers: {
      IndexedDB: IndexedDBTestProvider,
      WebSQL: WebSQLTestProvider,
      Memory: MemoryTestProvider
    },
    cleanup: cleanup,
    typedArrayEqual: typedArrayEqual
  };

});
