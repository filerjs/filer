define(["Filer", "util"], function(Filer, util) {

  describe('fs.stats', function() {
    describe('#isFile()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

      it('should be a function', function() {
        var fs = util.fs(); 
        expect(fs.stat.isFile).to.be.a('function');
      });

      it('should return true if stats are for file', function(done) {
        var fs = util.fs(); 
        var contents = "This is a file.";

        fs.writeFile('/myFile', contents, function(error) {
          if(error) throw error;
          fs.stat('/myFile').isFile(function (error, data) {
            expect(error).not.to.exist;
            expect(data).toEqual(true);
            done()
          });
        });
      });
    });

   /* describe('#isDirectory()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

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
    });

    describe('#isBlockDevice()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
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
    });

    describe('#isCharacterDevice()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
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
    });

    describe('#isSymbolicLink()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
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
    });

    describe('#isFIFO()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
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
    });

    describe('#isSocket()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
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
    });*/
  });
)