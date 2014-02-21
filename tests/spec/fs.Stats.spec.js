define(["Filer"], function(Filer) {

  describe('fs.Stats', function() {
    describe('#isFile()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });

      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isFile).toEqual('function');
      });

      it('should return true if stats are for file', function() {
        var complete = false;
        var _error, _result;
        var that = this;

        var contents = "This is a file.";

        that.fs.writeFile('/myFile', contents, binary, function(error) {
          if(error) throw error;
          _result = that.fs.stat('/myFile', function() {}).isFile();
          complete = true;
        })

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(true);
        });
      });
    })

    describe('#isDirectory()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });
      
      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isDirectory).toEqual('function');
      });

      it('should only return true if stats are for directory', function() {
        var complete = false;
        var _result;
        var that = this;

        _result = that.fs.stat('/myFile', function(error) {
          if(error) throw error;
        }).isFile();
        complete = true;

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(true);
        });
      });
    })

    describe('#isBlockDevice()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });
      
      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isBlockDevice).toEqual('function');
      });

      it('should return false', function() {
        var complete = false;
        var _result;
        var that = this;

        _result = that.fs.stat('/', function(error) {
          if(error) throw error;
        }).isBlockDevice();
        complete = true;

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(false);
        });
      });
    })

    describe('#isCharacterDevice()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });
      
      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isCharacterDevice).toEqual('function');
      });

      it('should return false', function() {
        var complete = false;
        var _result;
        var that = this;

        _result = that.fs.stat('/', function(error) {
          if(error) throw error;
        }).isCharacterDevice();
        complete = true;

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(false);
        });
      });
    })

    describe('#isSymbolicLink()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });
      
      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isSymbolicLink).toEqual('function');
      });

      it('should return true if stats are for symbolic link', function() {
        var complete = false;
        var _error, _result;
        var that = this;

        that.fs.writeFile('/myfile', '', { encoding: 'utf8' }, function(error) {
          if(error) throw error;
          that.fs.symlink('/myfile', '/myFileLink', function (error) {
            if (error) throw error;
            _result = that.fs.lstat('/myfile', function(error) {
              if(error) throw error;
            }).isSymbolicLink();
            complete = true;
          });
        });
        
        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(true);
        });
      });
    })

    describe('#isFIFO()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });
      
      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isFIFO).toEqual('function');
      });

      it('should return false', function() {
        var complete = false;
        var _result;
        var that = this;

        _result = that.fs.stat('/', function(error) {
          if(error) throw error;
        }).isFIFO();
        complete = true;

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(false);
        });
      });
    })

    describe('#isSocket()', function() {
      beforeEach(function() {
        this.db_name = mk_db_name();
        this.fs = new Filer.FileSystem({
          name: this.db_name,
          flags: 'FORMAT'
        });
      });

      afterEach(function() {
        indexedDB.deleteDatabase(this.db_name);
        delete this.fs;
      });
      
      it('should be a function', function() {
        var testStat = this.fs.stat('/', function(error) {
          if(error) throw error;
        });
        expect(typeof this.testStat.isSocket).toEqual('function');
      });

      it('should return false', function() {
        var complete = false;
        var _result;
        var that = this;

        _result = that.fs.stat('/', function(error) {
          if(error) throw error;
        }).isSocket();
        complete = true;

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(false);
        });
      });
    })
  }