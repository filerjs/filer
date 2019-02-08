var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.lstat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.lstat).to.equal('function');
  });

  it('should return an error if path does not exist', function(done) {
    var fs = util.fs();

    fs.lstat('/tmp', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return a stat object if path is not a symbolic link', function(done) {
    var fs = util.fs();

    fs.lstat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.isDirectory()).to.be.true;
      done();
    });
  });

  it('should return a stat object if path is a symbolic link', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/mylink', function(error) {
      if(error) throw error;

      fs.lstat('/mylink', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.isSymbolicLink()).to.be.true;
        done();
      });
    });
  });

  it('should have a mode (full node) when stat\'d with lstat', function(done) {
    var fs = util.fs();

    fs.writeFile('/file', 'data', function(error) {
      if(error) throw error;

      fs.symlink('/file', '/symlink', function(error) {
        if(error) throw error;

        fs.lstat('/symlink', function(error, stats) {
          if(error) throw error;

          // We should build and return a full node object, complete with
          // calculated mode, which should be a SYMLINK and the default file permissions.
          expect(stats.mode).to.equal(fs.constants.S_IFLNK | 0o644);
          done();
        });
      });
    });
  });
});

describe('fs.promises.lstat', () => {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should return an error if path does not exist', () => {
    var fsPromises = util.fs().promises;
    
    return fsPromises.lstat('/tmp')
      .catch( error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });

  it('should return a stat object if path is not a symbolic link', () => {
    var fsPromises = util.fs().promises;

    return fsPromises.lstat('/')
      .then(result => {
        expect(result).to.exist;
        expect(result.isDirectory()).to.be.true;
      });
  });
});
