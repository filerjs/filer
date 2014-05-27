var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.cat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.cat).to.be.a('function');
  });

  it('should fail when files argument is absent', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    shell.cat(null, function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(data).not.to.exist;
      done();
    });
  });

  it('should return the contents of a single file', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "file contents";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      shell.cat('/file', function(err, data) {
        expect(err).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should return the contents of multiple files', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        shell.cat(['/file', '/file2'], function(err, data) {
          expect(err).not.to.exist;
          expect(data).to.equal(contents + '\n' + contents2);
          done();
        });
      });
    });
  });

  it('should fail if any of multiple file paths is invalid', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        shell.cat(['/file', '/nofile'], function(err, data) {
          expect(err).to.exist;
          expect(err.code).to.equal("ENOENT");
          expect(data).not.to.exist;
          done();
        });
      });
    });
  });
});
