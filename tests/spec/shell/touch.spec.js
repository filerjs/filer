var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;
var optionals = require('../../../src/shell/optional');

function getTimes(fs, path, callback) {
  fs.stat(path, function(error, stats) {
    if(error) throw error;
    callback({mtime: stats.mtime, atime: stats.atime});
  });
}

describe('(optional) FileSystemShell.touch', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function when bound to a shell', function() {
    var shell = util.shell();
    optionals.bindTouch(shell);

    expect(shell.touch).to.be.a('function');
  });

  it('should create a new file if path does not exist (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    optionals.bindTouch(shell);

    shell.touch('/newfile', function(error) {
      if(error) throw error;

      fs.stat('/newfile', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats.type).to.equal('FILE');
        done();
      });
    });
  });

  it('should skip creating a new file if options.updateOnly is true (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    optionals.bindTouch(shell);

    shell.touch('/newfile', { updateOnly: true }, function(error) {
      if(error) throw error;

      fs.stat('/newfile', function(error, stats) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should update times if path does exist (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    optionals.bindTouch(shell);

    fs.open('/newfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.futimes(fd, atime, mtime, function (error) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          getTimes(fs, '/newfile', function(times1) {
            shell.touch('/newfile', function(error) {
              expect(error).not.to.exist;

              getTimes(fs, '/newfile', function(times2) {
                expect(times2.mtime).to.be.above(times1.mtime);
                expect(times2.atime).to.be.above(times1.atime);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update times to specified date if path does exist (bound)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var date = Date.parse('1 Oct 2001 15:33:22');

    optionals.bindTouch(shell);

    fs.open('/newfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        shell.touch('/newfile', { date: date }, function(error) {
          expect(error).not.to.exist;

          getTimes(fs, '/newfile', function(times) {
            expect(times.mtime).to.equal(date);
            done();
          });
        });
      });
    });
  });

  it('should create a new file if path does not exist (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    optionals.touch(shell, '/newfile', function(error) {
      if(error) throw error;

      fs.stat('/newfile', function(error, stats) {
        expect(error).not.to.exist;
        expect(stats.type).to.equal('FILE');
        done();
      });
    });
  });

  it('should skip creating a new file if options.updateOnly is true (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    optionals.bindTouch(shell);

    optionals.touch(shell, '/newfile', { updateOnly: true }, function(error) {
      if(error) throw error;

      fs.stat('/newfile', function(error, stats) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should update times if path does exist (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    optionals.bindTouch(shell);

    fs.open('/newfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.futimes(fd, atime, mtime, function (error) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          getTimes(fs, '/newfile', function(times1) {
            optionals.touch(shell, '/newfile', function(error) {
              expect(error).not.to.exist;

              getTimes(fs, '/newfile', function(times2) {
                expect(times2.mtime).to.be.above(times1.mtime);
                expect(times2.atime).to.be.above(times1.atime);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update times to specified date if path does exist (convenience)', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var date = Date.parse('1 Oct 2001 15:33:22');

    optionals.bindTouch(shell);

    fs.open('/newfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        optionals.touch(shell, '/newfile', { date: date }, function(error) {
          expect(error).not.to.exist;

          getTimes(fs, '/newfile', function(times) {
            expect(times.mtime).to.equal(date);
            done();
          });
        });
      });
    });
  });
});
