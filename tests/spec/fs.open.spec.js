var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var { FIRST_DESCRIPTOR } = require('../../src/constants.js');

describe('fs.open', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.open).to.be.a('function');
  });

  it('should return an error if the parent path does not exist', function(done) {
    var fs = util.fs();

    fs.open('/tmp/myfile', 'w+', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return an error when flagged for read and the path does not exist', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'r+', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return an error when flagged for write and the path is a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp', 'w', function(error, result) {
        expect(error).to.exist;
        expect(error.code).to.equal('EISDIR');
        expect(result).not.to.exist;
        done();
      });
    });
  });

  it('should return an error when flagged for write and the path exists', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.writeFile('/tmp/file', 'data', function(error) {
        if(error) throw error;
        fs.open('/tmp/file', 'wx', function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal('EEXIST');
          expect(result).not.to.exist;
          done();
        });
      });
    });
  });

  it('should return an error when flagged for append and the path is a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp', 'a', function(error, result) {
        expect(error).to.exist;
        expect(error.code).to.equal('EISDIR');
        expect(result).not.to.exist;
        done();
      });
    });
  });

  it('should return a unique file descriptor', function(done) {
    var fs = util.fs();

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(error).not.to.exist;
      expect(fd).to.be.a('number');

      fs.open('/file2', 'w+', function(error, fd1) {
        if(error) throw error;
        expect(error).not.to.exist;
        expect(fd1).to.be.a('number');
        expect(fd1).not.to.equal(fd);

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.close(fd1, done);
        });
      });
    });
  });

  it('should return the argument value of the file descriptor index greater than or equal to the value set by the first useable file descriptor constant', function(done) {
    var fs = util.fs();

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(fd).to.equal(FIRST_DESCRIPTOR);
      fs.close(fd, done);
    });
  });

  it('should reuse file descriptors after closing', function(done) {
    var fs = util.fs();

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(fd).to.equal(FIRST_DESCRIPTOR);

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.open('/file1', 'w+', function(error, fd) {
          if(error) throw error;
          expect(fd).to.equal(FIRST_DESCRIPTOR);
  
          fs.close(fd, done);
        });
      });
    });
  });

  it('should create a new file when flagged for write', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;
      
      fs.stat('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.isFile()).to.be.true;
        fs.close(fd, done);
      });
    });
  });


  it('should create a new file, when flagged for write, and set the mode to the passed value', function(done) {

    var fs = util.fs();
    fs.open('/myfile', 'w', 0o777, function(error, fd) {
      if(error) throw error;

      fs.stat('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.mode).to.exist;
        expect(result.mode & 0o777).to.equal(0o777);
        fs.close(fd, done);
      });
    });
  });

  it('should create a new file, but no mode is passed, so  the default value of 644 should be seen', function(done) {

    var fs = util.fs();
    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.stat('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.mode).to.exist;
        expect(result.mode & 0o644).to.equal(0o644);
        fs.close(fd, done);
      });
    });
  });

  /**
   * This test is currently correct per our code, but incorrect according to the spec.
   * When we fix https://github.com/filerjs/filer/issues/314 we'll have to update this.
   */
  it('should error if an ofd\'s node goes away while open', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;

      fs.open('/myfile', 'r', function(error, fd) {
        if(error) throw error;

        // Delete the file while it's still open
        fs.unlink('/myfile', function(error) {
          if(error) throw error;

          // This should fail now, since fd points to a bad node
          fs.fstat(fd, function(error, result) {
            expect(error).to.exist;
            expect(error.code).to.equal('EBADF');
            expect(result).not.to.exist;

            fs.close(fd, done);
          });
        });
      });
    });
  });

  it('should error when flag is invalid', function(done) { 
    var fs = util.fs();

    fs.open('/myfile', 'abcd', function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });
});
