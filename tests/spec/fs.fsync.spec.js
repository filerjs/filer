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
    fs.fsync('1', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EINVAL');
      done();
    });
  });

  it('should return error when fd is invalid', function(done) {
    var fs = util.fs();
    fs.fsync(1, function(error) {
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
          expect(error).to.not.exist;
          fs.close(done);
        });
      });
    });
  });
});
