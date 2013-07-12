var TEST_DATABASE_NAME = 'test';
var DEFAULT_TIMEOUT = 5000;

var next_id = 1;
function mk_db_name() {
  return TEST_DATABASE_NAME + next_id++;
};

describe("IDBFS", function() {
  it("is defined", function() {
    expect(typeof IDBFS).not.toEqual(undefined);
  });

  it("has FileSystem constructor", function() {
    expect(typeof IDBFS.FileSystem).toEqual('function');
  });
});

describe("new fs", function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it("is an object", function() {
    expect(typeof this.fs).toEqual('object');
  });

  var api_methods = [
    "mkdir",
    "rmdir",
    "readdir",
    "link",
    "unlink",
    "open",
    "close",
    "read",
    "write",
    "setxattr",
    "getxattr",
    "stat",
    "fstat",
  ];

  api_methods.forEach(function(method) {
    it("has method " + method, function() {
      expect(typeof this.fs[method]).toEqual('function');
    });
  });

  it('should have a root directory', function() {
    var complete = false;
    var _error, _result;

    this.fs.stat('/', function(error, result) {
      _error = error;
      _result = result;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'stat to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_result).toBeDefined();
    });
  });
});

describe('stat', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  describe('on non-existing path', function() {
    it('should return an error', function() {
      var complete = false;
      var _error, _result;

      this.fs.stat('/tmp', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'stat to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });

    it('should not return a result', function() {
      var complete = false;
      var _error, _result;

      this.fs.stat('/tmp', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'stat to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).not.toBeDefined();
      });
    });
  });

  describe('on existing path', function() {
    it('should return a stat object', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      this.fs.mkdir('/tmp', function(error) {
        if(error) throw error;
        that.fs.stat('/tmp', function(error, result) {
          _error = error;
          _result = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'stat to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_result['dev']).toEqual(that.db_name);
        expect(_result['nlinks']).toEqual(jasmine.any(Number));
        expect(_result['atime']).toEqual(jasmine.any(Number));
        expect(_result['mtime']).toEqual(jasmine.any(Number));
        expect(_result['ctime']).toEqual(jasmine.any(Number));
      });
    });
  });
});