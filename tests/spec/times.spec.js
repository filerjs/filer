'use strict';
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('node times (atime, mtime, ctimeMs)', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  const dirname = '/dir';
  const filename = '/dir/file';

  function createTree(callback) {
    const fs = util.fs();
    fs.mkdir(dirname, function(error) {
      if(error) throw error;

      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.close(fd, callback);
      });
    });
  }

  function stat(path, callback) {
    const fs = util.fs();
    fs.stat(path, function(error, stats) {
      if(error) throw error;

      callback(stats);
    });
  }

  it('should update ctime when calling fs.rename()', function(done) {
    const fs = util.fs();
    const newfilename = filename + '1';

    createTree(function() {
      stat(filename, function(stats1) {

        fs.rename(filename, newfilename, function(error) {
          if(error) throw error;

          stat(newfilename, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, mtime, atime when calling fs.truncate()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.truncate(filename, 5, function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, mtime, atime when calling fs.ftruncate()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.ftruncate(fd, 5, function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
              expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);

              fs.close(fd, done);
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.stat()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.stat(filename, function(error, stats2) {
          if(error) throw error;

          expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
          expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
          expect(stats2.atimeMs).to.equal(stats1.atimeMs);
          done();
        });
      });
    });
  });

  it('should make no change when calling fs.fstat()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.fstat(fd, function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.equal(stats1.atimeMs);

            fs.close(fd, done);
          });
        });
      });
    });
  });

  it('should make no change when calling fs.lstat()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.link(filename, '/link', function(error) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.lstat('/link', function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.equal(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.exists()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {

        fs.exists(filename, function(exists) {
          expect(exists).to.be.true;

          fs.stat(filename, function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.equal(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.link()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.link(filename, '/link', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.symlink()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.symlink(filename, '/link', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.equal(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.readlink()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.symlink(filename, '/link', function(error) {
        if(error) throw error;

        stat('/link', function(stats1) {
          fs.readlink('/link', function(error, contents) {
            if(error) throw error;
            expect(contents).to.equal(filename);

            stat('/link', function(stats2) {
              expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
              expect(stats2.atimeMs).to.equal(stats1.atimeMs);
              done();
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime, mtime of parent dir when calling fs.unlink()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(dirname, function(stats1) {
        fs.unlink(filename, function(error) {
          if(error) throw error;

          stat(dirname, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime, mtime of parent dir when calling fs.rmdir()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat('/', function(stats1) {

        fs.unlink(filename, function(error) {
          if(error) throw error;

          fs.rmdir(dirname, function(error) {
            if(error) throw error;

            stat('/', function(stats2) {
              expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
              expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
              done();
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime, mtime of parent dir when calling fs.mkdir()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat('/', function(stats1) {

        fs.mkdir('/a', function(error) {
          if(error) throw error;

          stat('/', function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should make no change when calling fs.close()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.close(fd, function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
              expect(stats2.atimeMs).to.equal(stats1.atimeMs);
              done();
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.open()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.equal(stats1.atimeMs);

            fs.close(fd, done);
          });
        });
      });
    });
  });

  /**
   * fs.utimes and fs.futimes are tested elsewhere already, skipping
   */

  it('should update atime, ctime, mtime when calling fs.write()', function(done) {
    const fs = util.fs();
    const buffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

    createTree(function() {
      fs.open('/myfile', 'w', function(error, fd) {
        if(error) throw error;

        stat('/myfile', function(stats1) {
          fs.write(fd, buffer, 0, buffer.length, 0, function(error, nbytes) {
            if(error) throw error;
            expect(nbytes).to.equal(buffer.length);

            fs.close(fd, function(error) {
              if(error) throw error;

              stat('/myfile', function(stats2) {
                expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
                expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
                expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.read()', function(done) {
    const fs = util.fs();
    const buffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

    createTree(function() {
      fs.open('/myfile', 'w', function(err, fd) {
        if(err) throw err;

        fs.write(fd, buffer, 0, buffer.length, 0, function(err, nbytes) {
          if(err) throw err;
          expect(nbytes).to.equal(buffer.length);

          fs.close(fd, function(error) {
            if(error) throw error;

            fs.open('/myfile', 'r', function(error, fd) {
              if(error) throw error;

              stat('/myfile', function(stats1) {
                const buffer2 = Buffer.alloc(buffer.length);

                fs.read(fd, buffer2, 0, buffer2.length, 0, function(err, nbytes) {
                  if(err) throw err;
                  expect(nbytes).to.equal(buffer2.length);

                  fs.close(fd, function(error) {
                    if(error) throw error;

                    stat('/myfile', function(stats2) {
                      expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
                      expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
                      expect(stats2.atimeMs).to.equal(stats1.atimeMs);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.readFile()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.readFile(filename, function(error, data) {
          if(error) throw error;
          expect(data).to.exist;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.equal(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update atime, ctime, mtime when calling fs.writeFile()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.writeFile(filename, 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update atime, ctime, mtime when calling fs.appendFile()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.appendFile(filename, '...more data', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.be.at.least(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.setxattr()', function(done) {
    const fs = util.fs();

    createTree(function() {
      stat(filename, function(stats1) {
        fs.setxattr(filename, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats2) {
            expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
            expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
            expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
            done();
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.fsetxattr()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.fsetxattr(fd, 'extra', 'data', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
              expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
              fs.close(fd, done);
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.getxattr()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.setxattr(filename, 'extra', 'data', function(error) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.getxattr(filename, 'extra', function(error, value) {
            if(error) throw error;
            expect(value).to.equal('data');

            stat(filename, function(stats2) {
              expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
              expect(stats2.atimeMs).to.equal(stats1.atimeMs);
              done();
            });
          });
        });
      });
    });
  });

  it('should make no change when calling fs.fgetxattr()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.fsetxattr(fd, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.fgetxattr(fd, 'extra', function(error, value) {
              if(error) throw error;
              expect(value).to.equal('data');

              stat(filename, function(stats2) {
                expect(stats2.ctimeMs).to.equal(stats1.ctimeMs);
                expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
                expect(stats2.atimeMs).to.equal(stats1.atimeMs);
                fs.close(fd, done);
              });
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.removexattr()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.setxattr(filename, 'extra', 'data', function(error) {
        if(error) throw error;

        stat(filename, function(stats1) {
          fs.removexattr(filename, 'extra', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
              expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
              expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
              done();
            });
          });
        });
      });
    });
  });

  it('should update ctime, atime when calling fs.fremovexattr()', function(done) {
    const fs = util.fs();

    createTree(function() {
      fs.open(filename, 'w', function(error, fd) {
        if(error) throw error;

        fs.fsetxattr(fd, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.fremovexattr(fd, 'extra', function(error) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctimeMs).to.be.at.least(stats1.ctimeMs);
                expect(stats2.mtimeMs).to.equal(stats1.mtimeMs);
                expect(stats2.atimeMs).to.be.at.least(stats1.atimeMs);
                fs.close(fd, done);
              });
            });
          });
        });
      });
    });
  });
});
