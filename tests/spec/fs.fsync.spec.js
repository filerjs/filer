var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.fsync', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.fsync).to.be.a('function');
  });

  it('should return error when fd is not a number', function(done) {
    var fs = util.fs();
    fs.fsync('notAnInteger', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EINVAL');
      done();
    });
  });

  it('should return an error if file descriptor is negative', function(done) {
    let fs = util.fs();

    // File descriptor should be a non-negative number
    fs.fsync(-1, function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      done();
    });
  });

  it('should not error if the fd is valid', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile', 'contents', function(error) {
      if(error) throw error;

      fs.open('/myfile', 'r', function(error, fd) {
        if(error) throw error;

        fs.fsync(fd, function(error) {
          expect(error).not.to.exist;
          fs.close(fd, done);
        });
      });
    });
  });
});
