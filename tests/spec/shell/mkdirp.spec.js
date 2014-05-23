var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.mkdirp', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.mkdirp).to.be.a('function');
  });

  it('should fail without a path provided', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    shell.mkdirp(null, function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });

  it('should succeed if provided path is root', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    shell.mkdirp('/', function(err) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('should succeed if the directory exists', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    fs.mkdir('/test', function(err){
      expect(err).to.not.exist;
      shell.mkdirp('/test',function(err) {
        expect(err).to.not.exist;
        done();
      });
    });
  });

  it('fail if a file name is provided', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    fs.writeFile('/test.txt', 'test', function(err){
      expect(err).to.not.exist;
      shell.mkdirp('/test.txt', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        done();
      });
    });
  });

  it('should succeed on a folder on root (\'/test\')', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    shell.mkdirp('/test', function(err) {
      expect(err).to.not.exist;
      fs.exists('/test', function(dir){
        expect(dir).to.be.true;
        done();
      });
    });
  });

  it('should succeed on a folder with a nonexistant parent (\'/test/test\')', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    shell.mkdirp('/test/test', function(err) {
      expect(err).to.not.exist;
      fs.exists('/test', function(dir1){
        expect(dir1).to.be.true;
        fs.exists('/test/test', function(dir2){
          expect(dir2).to.be.true;
          done();
        });
      });
    });
  });

  it('should fail on a folder with a file for its parent (\'/test.txt/test\')', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    fs.writeFile('/test.txt', 'test', function(err){
      expect(err).to.not.exist;
      shell.mkdirp('/test.txt/test', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        done();
      });
    });
  });
});
