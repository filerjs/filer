var Path = require('../../src').Path;
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.stats', function() {
  describe('#isFile()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFile).to.be.a('function');
        done();
      });
    });

    it('should return true if stats are for file', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.fstat(fd, function(error, stats) {
          expect(stats.isFile()).to.be.true;
          done();
        });
      });
    });

    it('should return false if stats are for directory', function(done) {
      var fs = util.fs();

      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFile()).to.be.false;
        done();
      });
    });

    it('should return false if stats are for symbolic link', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;
            fs.lstat('/myfilelink', function(error, stats) {
              expect(stats.isFile()).to.be.false;
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

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isDirectory).to.be.a('function');
        done();
      });
    });

    it('should return false if stats are for file', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.fstat(fd, function(error, stats) {
          expect(stats.isDirectory()).to.be.false;
          done();
        });
      });
    });

    it('should return true if stats are for directory', function(done) {
      var fs = util.fs();

      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });

    it('should return false if stats are for symbolic link', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error) {
          if(error) throw error;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;
            fs.lstat('/myfilelink', function(error, stats) {
              expect(stats.isDirectory()).to.be.false;
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

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isBlockDevice).to.be.a('function');
        done();
      });
    });

    it('should return false', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isBlockDevice()).to.be.false;
        done();
      });
    });
  });

  describe('#isCharacterDevice()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isCharacterDevice).to.be.a('function');
        done();
      });
    });

    it('should return false', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isCharacterDevice()).to.be.false;
        done();
      });
    });
  });

  describe('#isSymbolicLink()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSymbolicLink).to.be.a('function');
        done();
      });
    });

    it('should return false if stats are for file', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.fstat(fd, function(error, stats) {
          expect(stats.isSymbolicLink()).to.be.false;
          done();
        });
      });
    });

    it('should return false if stats are for directory', function(done) {
      var fs = util.fs();

      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSymbolicLink()).to.be.false;
        done();
      });
    });

    it('should return true if stats are for symbolic link', function(done) {
      var fs = util.fs();

      fs.open('/myfile', 'w+', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error) {
          if(error) throw error;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;
            fs.lstat('/myfilelink', function(error, stats) {
              expect(stats.isSymbolicLink()).to.be.true;
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

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFIFO).to.be.a('function');
        done();
      });
    });

    it('should return false', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFIFO()).to.be.false;
        done();
      });
    });
  });

  describe('#isSocket()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSocket).to.be.a('function');
        done();
      });
    });

    it('should return false', function(done) {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSocket()).to.be.false;
        done();
      });
    });
  });

  describe('generated name property', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);
    
    it('should correct return name for a file', function(done) {
      var fs = util.fs();
      var filepath = '/a';

      fs.writeFile(filepath, 'data', function(err) {
        if(err) throw err;

        fs.stat(filepath, function(err, stats) {
          if(err) throw err;

          expect(stats.name).to.equal(Path.basename(filepath));
          done();
        });
      });
    });

    it('should correct return name for an fd', function(done) {
      var fs = util.fs();
      var filepath = '/a';

      fs.open(filepath, 'w', function(err, fd) {
        if(err) throw err;

        fs.fstat(fd, function(err, stats) {
          if(err) throw err;

          expect(stats.name).to.equal(Path.basename(filepath));
          done();
        });
      });
    });
  });
});
