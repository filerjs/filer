var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;
var optionals = require('../../../src/shell/optional');

describe('(optional) FileSystemShell.cat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function when bound to shell', function() {
    var shell = util.shell();
    optionals.bindCat(shell);

    expect(shell.cat).to.be.a('function');
  });

  it('should fail when files argument is absent (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    optionals.bindCat(shell);

    shell.cat(null, function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(data).not.to.exist;
      done();
    });
  });

  it('should return the contents of a single file (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";

    optionals.bindCat(shell);

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      shell.cat('/file', function(err, data) {
        expect(err).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should return the contents of multiple files (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    optionals.bindCat(shell);

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

  it('should fail if any of multiple file paths is invalid (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    optionals.bindCat(shell);

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

  it('should fail when files argument is absent (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    optionals.cat(shell, null, function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(data).not.to.exist;
      done();
    });
  });

  it('should return the contents of a single file (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      optionals.cat(shell, '/file', function(err, data) {
        expect(err).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should return the contents of multiple files (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        optionals.cat(shell, ['/file', '/file2'], function(err, data) {
          expect(err).not.to.exist;
          expect(data).to.equal(contents + '\n' + contents2);
          done();
        });
      });
    });
  });

  it('should fail if any of multiple file paths is invalid (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "file contents";
    var contents2 = contents + '\n' + contents;

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        optionals.cat(shell, ['/file', '/nofile'], function(err, data) {
          expect(err).to.exist;
          expect(err.code).to.equal("ENOENT");
          expect(data).not.to.exist;
          done();
        });
      });
    });
  });
});
