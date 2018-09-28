var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.utimes', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs();
    expect(fs.utimes).to.be.a('function');
  });

  it('should error when atime is negative', function (done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', -1, Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when mtime is negative', function (done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), -1, function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when atime is as invalid number', function (done) {
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

  it('should error when path does not exist', function (done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.utimes('/pathdoesnotexist', atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should error when mtime is an invalid number', function (done) {
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

  it('should error when file descriptor is invalid', function (done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.futimes(1, atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      done();
    });
  });

  it('should change atime and mtime of a file path', function (done) {
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

  it('should change atime and mtime for a valid file descriptor', function (done) {
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

  it('should update atime and mtime of directory path', function (done) {
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

  it('should update atime and mtime using current time if arguments are null', function (done) {
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

  it('should error when atime is negative', function() {
    var fs = util.fs().promises;
    return fs.writeFile('/testfile', '')
      .then(function() {
        fs.utimes('/testfile', -1, Date.now())
        .then(() => {
        }, function(err) {
          expect(error).to.exist;
          expect(error.code).to.equal('EINVAL');
        })
      })
      .catch(function(err) {
        throw err; 
      });
  });

  it('should create a link to an existing file', function (done) {
    var fs = util.fs();
    fs.open('/myfile', 'w+', function (error, fd) {
      if (error) throw error;
      fs.close(fd, function (error) {
        if (error) throw error;
        fs.promises.link('/myfile', '/myotherfile').then(function () {
          fs.stat('/myfile', function (error, result) {
            if (error) throw error;

            var _oldstats = result;
            fs.stat('/myotherfile', function (error, result) {
              expect(error).not.to.exist;
              expect(result.nlinks).to.equal(2);
              expect(result.dev).to.equal(_oldstats.dev);
              expect(result.node).to.equal(_oldstats.node);
              expect(result.size).to.equal(_oldstats.size);
              expect(result.type).to.equal(_oldstats.type);
              done();
            });
          },
            function (error) { throw error; }
          );
        });
      });
    });
  });

  it('should create hard link to identical data node', function (done) {
    var fs = util.fs();
    var contents = 'Hello World!';
    fs.writeFile('/file', contents, function (err) {
      if (err) throw err;
      fs.promises.link('/file', '/hlink', function (err) {
        if (err) throw err;
        fs.readFile('/file', 'utf8', function (err, fileData) {
          if (err) throw err;
          fs.readFile('/hlink', 'utf8', function (err, hlinkData) {
            if (err) throw err;
            expect(fileData).to.equal(hlinkData);
            done();
          });
        });
      });
    });
  });

  it('should not follow symbolic links', function (done) {
    var fs = util.fs();
    fs.stat('/', function (error, result) {
      if (error) throw error;
      expect(result).to.exist;
      fs.symlink('/', '/myfileLink', function (error) {
        if (error) throw error;
        fs.promises.link('/myfileLink', '/myotherfile').then(function () {
          if (error) throw error;

          fs.lstat('/myfileLink', function (error, result) {

            var _linkstats = result;
            fs.lstat('/myotherfile', function (error, result) {
              expect(error).not.to.exist;
              expect(result.dev).to.equal(_linkstats.dev);
              expect(result.node).to.equal(_linkstats.node);
              expect(result.size).to.equal(_linkstats.size);
              expect(result.type).to.equal(_linkstats.type);
              expect(result.nlinks).to.equal(2);
              done();
            });
          },
            function (error) { throw error; }
          );
        });
      });
    });
  });
  
  it('should not allow links to a directory', function (done) {
    var fs = util.fs();
    fs.mkdir('/mydir', function (error) {
      if (error) throw error;
      fs.promises.link('/mydir', '/mydirlink', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EPERM');
        done();
      });
    });
  });
});