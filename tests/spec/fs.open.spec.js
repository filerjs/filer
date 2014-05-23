var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var constants = require('../../src/constants.js');

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
      expect(error.code).to.equal("ENOENT");
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return an error when flagged for read and the path does not exist', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'r+', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
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
        expect(error.code).to.equal("EISDIR");
        expect(result).not.to.exist;
        done();
      });
    });
  });

  it('should return an error when flagged for append and the path is a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp', 'a', function(error, result) {
        expect(error).to.exist;
        expect(error.code).to.equal("EISDIR");
        expect(result).not.to.exist;
        done();
      });
    });
  });

  it('should return a unique file descriptor', function(done) {
    var fs = util.fs();
    var fd1;

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(error).not.to.exist;
      expect(fd).to.be.a('number');

      fs.open('/file2', 'w+', function(error, fd) {
        if(error) throw error;
        expect(error).not.to.exist;
        expect(fd).to.be.a('number');
        expect(fd).not.to.equal(fd1);
        done();
      });
    });
  });

  it('should return the argument value of the file descriptor index matching the value set by the first useable file descriptor constant', function(done) {
    var fs = util.fs();
    var firstFD = constants.FIRST_DESCRIPTOR;
    var fd1;

    fs.open('/file1', 'w+', function(error, fd) {
      if(error) throw error;
      expect(fd).to.equal(firstFD);
      done();
    });
  });

  it('should create a new file when flagged for write', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      fs.stat('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('FILE');
        done();
      });
    });
  });
});
