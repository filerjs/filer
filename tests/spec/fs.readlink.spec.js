var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.readlink).to.be.a('function');
  });

  it('should return an error if part of the parent destination path does not exist', function(done) {
    var fs = util.fs();

    fs.readlink('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return an error if the path is not a symbolic link', function(done) {
    var fs = util.fs();

    fs.readlink('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      done();
    });
  });

  it('should return the contents of a symbolic link', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myfile', function(error) {
      if(error) throw error;

      fs.readlink('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.equal('/');
        done();
      });
    });
  });
});
