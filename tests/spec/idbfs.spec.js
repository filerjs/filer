var TEST_DATABASE_NAME = '__test';
var DEFAULT_TIMEOUT = 5000;

var test_database_names = [];
window.onbeforeunload = function() {
  test_database_names.forEach(function(name) {
    indexedDB.deleteDatabase(name);
  });
};

function mk_id(length) {
  var text = '';
  var tokens = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for( var i=0; i < length; i++ )
      text += tokens.charAt(Math.floor(Math.random() * tokens.length));

  return text;
};

function mk_db_name() {
  var name = TEST_DATABASE_NAME + mk_id(5);
  test_database_names.push(name);
  return name;
};

describe("IDBFS", function() {
  it("is defined", function() {
    expect(typeof IDBFS).not.toEqual(undefined);
  });

  it("has FileSystem constructor", function() {
    expect(typeof IDBFS.FileSystem).toEqual('function');
  });
});

describe("fs", function() {
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

  it('should have a root directory', function() {
    var complete = false;
    var _result;

    this.fs.stat('/', function(error, result) {
      _result = result;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_result).toBeDefined();
    });
  });
});

describe('fs.stat', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.stat).toEqual('function');
  });

  it('should return an error if path does not exist', function() {
    var complete = false;
    var _error, _result;

    this.fs.stat('/tmp', function(error, result) {
      _error = error;
      _result = result;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
      expect(_result).not.toBeDefined();
    });
  });

  it('should return a stat object if path exists', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    that.fs.stat('/', function(error, result) {
      _error = error;
      _result = result;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_result).toBeDefined();
      expect(_error).not.toBeDefined();
      expect(_result['dev']).toEqual(that.db_name);
      expect(_result['nlinks']).toEqual(jasmine.any(Number));
      expect(_result['atime']).toEqual(jasmine.any(Number));
      expect(_result['mtime']).toEqual(jasmine.any(Number));
      expect(_result['ctime']).toEqual(jasmine.any(Number));
    });
  });
});

describe('fs.mkdir', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.mkdir).toEqual('function');
  });

  it('should return an error if part of the parent path does not exist', function() {
    var complete = false;
    var _error;
    var that = this;

    that.fs.mkdir('/tmp/mydir', function(error) {
      _error = error;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'stat to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
    });
  });

  it('should return an error if the path already exists', function() {
    var complete = false;
    var _error;
    var that = this;

    that.fs.mkdir('/', function(error) {
      _error = error;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
    });
  });

  it('should make a new directory', function() {
    var complete = false;
    var _error, _result, _stat;
    var that = this;

    that.fs.mkdir('/tmp', function(error, result) {
      _error = error;
      _result = result;

      that.fs.stat('/tmp', function(error, result) {
        _stat = result;

        complete = true;
      });
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result).not.toBeDefined();
      expect(_stat).toBeDefined();
    });
  });
});

describe('fs.rmdir', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.rmdir).toEqual('function');
  });

  it('should return an error if the path does not exist', function() {
    var complete = false;
    var _error;
    var that = this;

    that.fs.rmdir('/tmp/mydir', function(error) {
      _error = error;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
    });
  });

  it('should return an error if attempting to remove the root directory', function() {
    var complete = false;
    var _error;
    var that = this;

    that.fs.rmdir('/', function(error) {
      _error = error;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
    });
  });

  it('should return an error if the directory is not empty', function() {
    var complete = false;
    var _error;
    var that = this;

    that.fs.mkdir('/tmp', function(error) {
      that.fs.mkdir('/tmp/mydir', function(error) {
        that.fs.rmdir('/', function(error) {
          _error = error;

          complete = true;
        });
      });
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
    });
  });

  it('should remove an existing directory', function() {
    var complete = false;
    var _error, _stat;
    var that = this;

    that.fs.mkdir('/tmp', function(error) {
      that.fs.rmdir('/tmp', function(error) {
        _error = error;
        that.fs.stat('/tmp', function(error, result) {
          _stat = result;

          complete = true;
        });
      });
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_stat).not.toBeDefined();
    });
  });
});

describe('fs.open', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.open).toEqual('function');
  });

  it('should return an error if the parent path does not exist', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    that.fs.open('/tmp/myfile', 'w+', function(error, result) {
      _error = error;
      _result = result;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
      expect(_result).not.toBeDefined();
    });
  });

  it('should return an error when flagged for read and the path does not exist', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    that.fs.open('/myfile', 'r+', function(error, result) {
      _error = error;
      _result = result;

      complete = true;
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
      expect(_result).not.toBeDefined();
    });
  });


  it('should return an error when flagged for write and the path is a directory', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    that.fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      that.fs.open('/tmp', 'w', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
      expect(_result).not.toBeDefined();
    });
  });

  it('should return an error when flagged for append and the path is a directory', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    that.fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      that.fs.open('/tmp', 'a', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).toBeDefined();
      expect(_result).not.toBeDefined();
    });
  });
/*
  it('should return a unique file descriptor', function() {
  });
*/
});