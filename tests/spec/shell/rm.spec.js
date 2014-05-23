var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.rm', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.rm).to.be.a('function');
  });

  it('should fail when path argument is absent', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    shell.rm(null, function(error, list) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(list).not.to.exist;
      done();
    });
  });

  it('should remove a single file', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "a";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      shell.rm('/file', function(err) {
        expect(err).not.to.exist;

        fs.stat('/file', function(err, stats) {
          expect(err).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });

  it('should remove an empty dir', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      shell.rm('/dir', function(err) {
        expect(err).not.to.exist;

        fs.stat('/dir', function(err, stats) {
          expect(err).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });

  it('should fail to remove a non-empty dir', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      shell.touch('/dir/file', function(err) {
        if(err) throw err;

        shell.rm('/dir', function(err) {
          expect(err).to.exist;
          expect(err.code).to.equal('ENOTEMPTY');
          done();
        });
      });
    });
  });

  it('should remove a non-empty dir with option.recursive set', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      shell.touch('/dir/file', function(err) {
        if(err) throw err;

        shell.rm('/dir', { recursive: true }, function(err) {
          expect(err).not.to.exist;

          fs.stat('/dir', function(err, stats) {
            expect(err).to.exist;
            expect(stats).not.to.exist;
            done();
          });
        });
      });
    });
  });

  it('should work on a complex dir structure', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.mkdir('/dir/dir2', function(err) {
        if(err) throw err;

        fs.writeFile('/dir/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir/file2', contents, function(err) {
            if(err) throw err;

            shell.rm('/dir', { recursive: true }, function(err) {
              expect(err).not.to.exist;

              fs.stat('/dir', function(err, stats) {
                expect(err).to.exist;
                expect(stats).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });
  });
});
