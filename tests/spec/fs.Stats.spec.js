define(["Filer", "util"], function(Filer, util) {

  describe('fs.stats', function() {
    describe('#isFile()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isFile).to.equal('function');
        });
      });

      it('should return true if stats are for file', function(done) {
        var fs = util.fs(); 

        fs.open('/myfile', 'w+', function(error, fd) {
          if(error) throw error;
          fs.fstat(fd, function(error, stats) {
            expect(stats.isFile()).to.equal(true);
            done();
          });
        });
      });

      it('should return false if stats are for directory', function(done) {
        var fs = util.fs(); 

        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isFile()).to.equal(false);
          done();
        });
      });

      it('should return false if stats are for symbolic link', function(done) {
        var fs = util.fs(); 

        fs.open('/myfile', 'w+', function(error, fd) {
          if(error) throw error;
          fs.close(fd, function(error, stats) {
            if(error) throw error;
            fs.symlink('/myfile', '/myfilelink', function(error) {
              if(error) throw error;
              fs.lstat('/myfilelink', function(error, stats) {
                expect(stats.isFile()).to.equal(false);
                done();
              });
            });
          });
        });
      });
    });

    describe('#isDirectory()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isDirectory).to.equal('function');
        });
      });

      it('should return false if stats are for file', function(done) {
        var fs = util.fs(); 

        fs.open('/myfile', 'w+', function(error, fd) {
          if(error) throw error;
          fs.fstat(fd, function(error, stats) {
            expect(stats.isDirectory()).to.equal(false);
            done();
          });
        });
      });

      it('should return true if stats are for directory', function(done) {
        var fs = util.fs(); 

        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isDirectory()).to.equal(true);
          done();
        });
      });

      it('should return false if stats are for symbolic link', function(done) {
        var fs = util.fs(); 

        fs.open('/myfile', 'w+', function(error, fd) {
          if(error) throw error;
          fs.close(fd, function(error, stats) {
            if(error) throw error;
            fs.symlink('/myfile', '/myfilelink', function(error) {
              if(error) throw error;
              fs.lstat('/myfilelink', function(error, stats) {
                expect(stats.isDirectory()).to.equal(false);
                done();
              });
            });
          });
        });
      });
    });

    describe('#isBlockDevice()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isBlockDevice).to.equal('function');
        });
      });

      it('should return false', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isBlockDevice()).to.equal(false);
        });
      });
    });

    describe('#isCharacterDevice()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isCharacterDevice).to.equal('function');
        });
      });

      it('should return false', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isCharacterDevice()).to.equal(false);
        });
      });
    });

    describe('#isSymbolicLink()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isSymbolicLink).to.equal('function');
        });
      });

      it('should return false if stats are for file', function(done) {
        var fs = util.fs(); 

        fs.open('/myfile', 'w+', function(error, fd) {
          if(error) throw error;
          fs.fstat(fd, function(error, stats) {
            expect(stats.isSymbolicLink()).to.equal(false);
            done();
          });
        });
      });

      it('should return false if stats are for directory', function(done) {
        var fs = util.fs(); 

        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isSymbolicLink()).to.equal(false);
          done();
        });
      });

      it('should return true if stats are for symbolic link', function(done) {
        var fs = util.fs(); 

        fs.open('/myfile', 'w+', function(error, fd) {
          if(error) throw error;
          fs.close(fd, function(error, stats) {
            if(error) throw error;
            fs.symlink('/myfile', '/myfilelink', function(error) {
              if(error) throw error;
              fs.lstat('/myfilelink', function(error, stats) {
                expect(stats.isSymbolicLink()).to.equal(true);
                done();
              });
            });
          });
        });
      });
    });

    describe('#isFIFO()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isFIFO).to.equal('function');
        });
      });

      it('should return false', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isFIFO()).to.equal(false);
        });
      });
    });

    describe('#isSocket()', function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);
      
      it('should be a function', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(typeof stats.isSocket).to.equal('function');
        });
      });

      it('should return false', function() {
        var fs = util.fs();
        fs.stat('/', function(error, stats) {
          if(error) throw error;
          expect(stats.isSocket()).to.equal(false);
        });
      });
    });
  });
});