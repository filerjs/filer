var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.rmdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.rmdir).to.be.a('function');
  });

  it('should return an error if the path does not exist', function(done) {
    var fs = util.fs();

    fs.rmdir('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return an error if attempting to remove the root directory', function(done) {
    var fs = util.fs();

    fs.rmdir('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EBUSY");
      done();
    });
  });

  it('should return an error if the directory is not empty', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.mkdir('/tmp/mydir', function(error) {
        if(error) throw error;
        fs.rmdir('/', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal("EBUSY");
          done();
        });
      });
    });
  });

  it('should return an error if the path is not a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp/myfile', 'w', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error) {
          if(error) throw error;
          fs.rmdir('/tmp/myfile', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal("ENOTDIR");
            done();
          });
        });
      });
    });
  });

  it('should return an error if the path is a symbolic link', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function (error) {
      if(error) throw error;
      fs.symlink('/tmp', '/tmp/myfile', function (error) {
        if(error) throw error;
        fs.rmdir('/tmp/myfile', function (error) {
          expect(error).to.exist;
          expect(error.code).to.equal("ENOTDIR");
          done();
        });
      });
    });
  });

  it('should remove an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.rmdir('/tmp', function(error) {
        expect(error).not.to.exist;
        if(error) throw error;
        fs.stat('/tmp', function(error, stats) {
          expect(error).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });
});
