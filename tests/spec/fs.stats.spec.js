var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.stats', function() {
  describe('#isFile()', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFile).to.be.a('function');
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
        fs.close(fd, function(error, stats) {
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

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isDirectory).to.be.a('function');
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
        fs.close(fd, function(error, stats) {
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

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isBlockDevice).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isBlockDevice()).to.be.false;
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
        expect(stats.isCharacterDevice).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isCharacterDevice()).to.be.false;
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
        expect(stats.isSymbolicLink).to.be.a('function');
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
        fs.close(fd, function(error, stats) {
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

    it('should be a function', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFIFO).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isFIFO()).to.be.false;
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
        expect(stats.isSocket).to.be.a('function');
      });
    });

    it('should return false', function() {
      var fs = util.fs();
      fs.stat('/', function(error, stats) {
        if(error) throw error;
        expect(stats.isSocket()).to.be.false;
      });
    });
  });
});
