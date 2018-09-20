var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.mkdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.mkdir).to.be.a('function');
  });

  it('should return an error if part of the parent path does not exist', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if the path already exists', function(done) {
    var fs = util.fs();

    fs.mkdir('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EEXIST');
      done();
    });
  });

  it('should make a new directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      expect(error).not.to.exist;
      if(error) throw error;

      fs.stat('/tmp', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats).to.exist;
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });

  it('should error if {recursive:true} is not specified on a deep path', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp/deep/path', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should error if only a mode is specified on a deep path (should default to recursive:false)', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp/deep/path', 0o777, function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should create all paths if {recursive:true} is specified on a deep path', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp/deep/path', {recursive:true}, function(error) {
      expect(error).not.to.exist;
      if(error) throw error;

      fs.stat('/tmp/deep/path', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats).to.exist;
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });

});
