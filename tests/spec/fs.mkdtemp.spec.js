var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.mkdtemp', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.mkdtemp).to.be.a('function');
  });

  it('should craete temp dir with specified prefix', function(done) {
    var fs = util.fs();
    fs.mkdtemp('/foo', function(error, path) {
      expect(error).not.to.exist;
      expect(path).to.match(/foo.{6}/);
      done();
    });
  });
  it('should craete temp dir inside existing directory', function(done) {
    var fs = util.fs();
    fs.mkdir('/myDir', (error) => {
      expect(error).not.to.exist;
      fs.mkdtemp('/myDir/foo', function(error, path) {
        expect(error).not.to.exist;
        expect(path).to.match(/foo.{6}/);
        done();
      });
    });
  });

  it('should not create temp dir without prefix', function(done) {
    var fs = util.fs();
    fs.mkdtemp('', function(error, path) {
      expect(error).to.exist;
      expect(path).to.be.equal('');
      done();
    });
  });
  it('should not create temp dir inside non existing dir', function(done) {
    var fs = util.fs();
    fs.mkdtemp('/doesNotExists/foo', function(error, path) {
      expect(error).to.exist;
      expect(error.code).to.be.equal('ENOENT');
      expect(path).to.exist;
      done();
    });
  });
});