var Filer = require('../..');
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
    var _error, _result;

    fs.lstat('/tmp', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return a stat object if path is not a symbolic link', function(done) {
    var fs = util.fs();

    fs.lstat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.type).to.equal('DIRECTORY');
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
        expect(result.type).to.equal('SYMLINK');
        done();
      });
    });
  });
});
