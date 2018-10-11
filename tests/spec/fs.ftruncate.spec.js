const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.ftruncate', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    let fs = util.fs();
    expect(fs.ftruncate).to.be.a('function');
  });

  it('should return an error if length is negative', function(done) {
    let fs = util.fs();
    let contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;

      fs.open('/myfile', 'w', function(err, fd) {

        fs.ftruncate(fd, -1, function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('EINVAL');
          done();
        });

        // Close file descriptor when done
        fs.close(fd);
      });
    });
  });

  it('should return an error if file descriptor is negative', function(done) {
    let fs = util.fs();

     // File descriptor should be a non-negative number
    fs.ftruncate(-1, 0, function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      done();
    });
  });

  it('should truncate a file', function(done) {
    let fs = util.fs();
    let buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    let truncated = new Buffer([1, 2]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      let fd = result;

      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;
        expect(result).to.equal(buffer.length);

        // Truncate file to first two bytes
        fs.ftruncate(fd, 2, function(error) {
          expect(error).not.to.exist;
        });

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.readFile('/myfile', function(error, result) {
            if(error) throw error;

            expect(result).to.deep.equal(truncated);
            done();
          });
        });
      });
    });
  });

  it('should truncate a valid descriptor', function(done) {
    var fs = util.fs();
    var buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;
        expect(result).to.equal(buffer.length);

        fs.ftruncate(fd, 0, function(error) {
          expect(error).not.to.exist;

          fs.fstat(fd, function(error, result) {
            if(error) throw error;

            expect(result.size).to.equal(0);
            done();
          });
        });
      });
    });
  });

  it('should pad a file with zeros when the length is greater than the file size', function(done) {
    let fs = util.fs();
    let buffer = new Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    let truncated = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 0]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      let fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;
        expect(result).to.equal(buffer.length);

        fs.ftruncate(fd, 9, function(error) {
          expect(error).not.to.exist;
        });

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.readFile('/myfile', function(error, result) {
            if(error) throw error;

            expect(result).to.deep.equal(truncated);
            done();
          });
        });
      });
    });
  });
});
