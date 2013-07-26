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

function array_buffer_equal(left, right) {
  if(left.length !== right.length) {
    return false;
  }

  for(var i = 0; i < left.length; ++ i) {
    if(left[i] !== right[i]) {
      return false;
    }
  }

  return true;
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
      expect(_result['node']).toBeDefined();
      expect(_result['dev']).toEqual(that.db_name);
      expect(_result['size']).toBeDefined();
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

  it('should return a unique file descriptor', function() {
    var complete1 = false;
    var complete2 = false;
    var _error, _result1, _result2;
    var that = this;

    that.fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      _error = error;
      _result1 = fd;

      complete1 = true;
    });
    that.fs.open('/file2', 'w+', function(error, fd) {
      if(error) throw error;
      _error = error;
      _result2 = fd;

      complete2 = true;
    });

    waitsFor(function() {
      return complete1 && complete2;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result1).toBeDefined();
      expect(_result2).toBeDefined();
      expect(_result1).not.toEqual(_result2);
    });
  });

  it('should create a new file when flagged for write', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    that.fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      that.fs.stat('/myfile', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      })
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result).toBeDefined();
    });
  });
});

describe('fs.write', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.write).toEqual('function');
  });

  it('should write data to a file', function() {
    var complete = false;
    var _error, _result, _stats;
    var that = this;

    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    that.fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        _error = error;
        _result = result;

        that.fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          _stats = result;

          complete = true;
        });
      })
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result).toEqual(buffer.length);
      expect(_stats.size).toEqual(buffer.length);
    });
  });

  it('should update the current file position', function() {
    var complete = false;
    var _error, _result, _stats;
    var that = this;

    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    _result = 0;

    that.fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;
        _result += result;

        that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;
          _result += result;

          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _stats = result;

            complete = true;
          });
        });
      })
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result).toEqual(2 * buffer.length);
      expect(_stats.size).toEqual(_result);
    });
  });
});

describe('fs.read', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.read).toEqual('function');
  });

  it('should read data from a file', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    var wbuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = new Uint8Array(wbuffer.length);

    that.fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd = result;
      that.fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;

        that.fs.read(fd, rbuffer, 0, rbuffer.length, 0, function(error, result) {
          _error = error;
          _result = result;

          complete = true;
        });
      })
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result).toEqual(rbuffer.length);
      expect(array_buffer_equal(wbuffer, rbuffer)).toEqual(true);
    });
  });

  it('should update the current file position', function() {
    var complete = false;
    var _error, _result;
    var that = this;

    var wbuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = new Uint8Array(wbuffer.length);
    _result = 0;

    that.fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd = result;
      that.fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;

        that.fs.read(fd, rbuffer, 0, rbuffer.length / 2, undefined, function(error, result) {
          if(error) throw error;

          _result += result;
          that.fs.read(fd, rbuffer, rbuffer.length / 2, rbuffer.length, undefined, function(error, result) {
            if(error) throw error;

            _result += result;
            complete = true;
          });
        });
      })
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_result).toEqual(rbuffer.length);
      expect(array_buffer_equal(wbuffer.buffer, rbuffer.buffer)).toEqual(true);
    });
  });
});

describe('fs.close', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.close).toEqual('function');
  });

  it('should release the file descriptor', function() {
    var complete = false;
    var _error;
    var that = this;

    var buffer = new Uint8Array(0);

    that.fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd = result;
      that.fs.close(fd, function(error) {
        that.fs.read(fd, buffer, 0, buffer.length, undefined, function(error, result) {
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
});

describe('fs.link', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.link).toEqual('function');
  });

  it('should create a link to an existing file', function() {
    var complete = false;
    var _error, _oldstats, _newstats;
    var that = this;

    that.fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd = result;
      that.fs.close(fd, function(error) {
        if(error) throw error;

        that.fs.link('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _oldstats = result;
            that.fs.stat('/myotherfile', function(error, result) {
              if(error) throw error;

              _newstats = result;

              complete = true;
            });
          });
        });
      });
    });

    waitsFor(function() {
      return complete;
    }, 'test to complete', DEFAULT_TIMEOUT);

    runs(function() {
      expect(_error).not.toBeDefined();
      expect(_newstats.node).toEqual(_oldstats.node);
      expect(_newstats.nlinks).toEqual(2);
      expect(_newstats).toEqual(_oldstats);
    });
  });
});

describe('fs.unlink', function() {
  beforeEach(function() {
    this.db_name = mk_db_name();
    this.fs = new IDBFS.FileSystem(this.db_name, 'FORMAT');
  });

  afterEach(function() {
    indexedDB.deleteDatabase(this.db_name);
    delete this.fs;
  });

  it('should be a function', function() {
    expect(typeof this.fs.unlink).toEqual('function');
  });
});