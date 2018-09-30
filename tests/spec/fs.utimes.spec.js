var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.utimes', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.utimes).to.be.a('function');
  });

  it('should error when atime is negative', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.utimes('/testfile', -1, Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when mtime is negative', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), -1, function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when atime is as invalid number', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', 'invalid datetime', Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when path does not exist', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.utimes('/pathdoesnotexist', atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should error when mtime is an invalid number', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), 'invalid datetime', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when file descriptor is invalid', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.futimes(1, atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      done();
    });
  });

  it('should change atime and mtime of a file path', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testfile', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtime).to.equal(mtime);
          done();
        });
      });
    });
  });

  it ('should change atime and mtime for a valid file descriptor', function(done) {
    var fs = util.fs();
    var ofd;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.open('/testfile', 'w', function (error, result) {
      if (error) throw error;

      ofd = result;
      fs.futimes(ofd, atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.fstat(ofd, function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtime).to.equal(mtime);
          done();
        });
      });
    });
  });

  it('should update atime and mtime of directory path', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.mkdir('/testdir', function (error) {
      if (error) throw error;

      fs.utimes('/testdir', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testdir', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtime).to.equal(mtime);
          done();
        });
      });
    });
  });

  it('should update atime and mtime using current time if arguments are null', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile', '', function (error) {
      if (error) throw error;

      var then = Date.now();
      fs.utimes('/myfile', null, null, function (error) {
        expect(error).not.to.exist;

        fs.stat('/myfile', function (error, stat) {
          expect(error).not.to.exist;
          // Note: testing estimation as time may differ by a couple of milliseconds
          // This number should be increased if tests are on slow systems
          var delta = Date.now() - then;
          expect(then - stat.atime).to.be.at.most(delta);
          expect(then - stat.mtime).to.be.at.most(delta);
          done();
        });
      });
    });
  });
});

describe('fs.promises.utimes', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs().promises;
    expect(fs.utimes).to.be.a('function');
  });

  it('should return a promise', function() {
    var fs = util.fs().promises;
    expect(fs.utimes()).to.be.a('Promise');
  });

  it('should error when atime is negative', function () {
    var fs = util.fs().promises;
    return fs.writeFile('/testfile', '')
      .then(function () {
        fs.utimes('/testfile', -1, Date.now())
          .catch(function (error) {
            expect(error).to.exist;
            expect(error.code).to.equal('EINVAL');
          });
      })
      .catch(function (error) {
        throw error;
      });
  });

  it('should error when mtime is negative', function () {
    var fs = util.fs().promises;

    return fs.writeFile('/testfile', '')
      .then(function () {
        fs.utimes('/testfile', Date.now(), -1)
          .catch(function (error) {
            expect(error).to.exist;
            expect(error.code).to.equal('EINVAL');
          });
      })
      .catch(function (error) {
        throw error;
      });
  });

  it('should error when mtime is an invalid number', function () {
    var fs = util.fs().promises;

    return fs.writeFile('/testfile', '')
      .then(function () {
        fs.utimes('/testfile', Date.now(), 'invalid datetime')
          .catch(function (error) {
            expect(error).to.exist;
            expect(error.code).to.equal('EINVAL');
          });
      })
      .catch(function (error) {
        throw error;
      });
  });

  it('should error when file descriptor is invalid', function () {
    var fs = util.fs().promises;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    return fs.utimes(1, atime, mtime)
      .catch(function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EBADF');
      });
  });

  it('should change atime and mtime of a file path', function () {
    var fs = util.fs().promises;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    return fs.writeFile('/testfile', '')
      .then(function () {
        fs.utimes('/testfile', atime, mtime)
          .then(function () {
            fs.stat('/testfile')
              .then(function (stat) {
                expect(stat.mtime).to.equal(mtime);
              })
              .catch(function (error) {
                expect(error).not.to.exist;
              });
          })
          .catch(function (error) {
            expect(error).not.to.exist;
          });
      })
      .catch(function (error) {
        throw error;
      });
  });

  it('should change atime and mtime for a valid file descriptor', function () {
    var fs = util.fs().promises;
    var ofd;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    return fs.open('/testfile', 'w')
      .then(function (result) {
        ofd = result;
        fs.futimes(ofd, atime, mtime)
          .then(function () {
            fs.fstat(ofd)
              .then(function (stat) {
                expect(stat.mtime).to.equal(mtime);
              })
              .catch(function (error) {
                expect(error).not.to.exist;
              });
          })
          .catch(function (error) {
            expect(error).not.to.exist;
          });
      })
      .catch(function (error) {
        throw error;
      });
  });

  it('should update atime and mtime of directory path', function () {
    var fs = util.fs().promises;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    return fs.mkdir('/testdir')
      .then(function () {
        fs.utimes('/testdir', atime, mtime)
          .then(function () {
            fs.stat('/testdir')
              .then(function (stat) {
                expect(stat.mtime).to.equal(mtime);
              })
              .catch(function (error) {
                expect(error).not.to.exist;
              });
          })
          .catch(function (error) {
            expect(error).not.to.exist;
          });
      })
      .catch(function (error) {
        throw error;
      });
  });

  it('should update atime and mtime using current time if arguments are null', function () {
    var fs = util.fs().promises;

    return fs.writeFile('/myfile', '')
      .then(function () {
        var then = Date.now();
        fs.utimes('/myfile', null, null)
          .then(function () {
            fs.stat('/myfile')
              .then(function (stat) {
                // Note: testing estimation as time may differ by a couple of milliseconds
                // This number should be increased if tests are on slow systems
                var delta = Date.now() - then;
                expect(then - stat.atime).to.be.at.most(delta);
                expect(then - stat.mtime).to.be.at.most(delta);
              })
              .catch(function (error) {
                expect(error).not.to.exist;
              });
          })
          .catch(function (error) {
            expect(error).not.to.exist;
          });
      })
      .catch(function (error) {
        throw error;
      });
  });
});
