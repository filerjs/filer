define(["Filer", "util"], function(Filer, util) {

  describe('node times (atime, mtime, ctime)', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    var dirname = "/dir";
    var filename = "/dir/file";

    function createTree(callback) {
      var fs = util.fs();
      fs.mkdir(dirname, function(error) {
        if(error) throw error;

        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.close(fd, callback);
        });
      });
    }

    function stat(path, callback) {
      var fs = util.fs();
      fs.stat(path, function(error, stats) {
        if(error) throw error;

        callback(stats);
      });
    }

    it('should update ctime when calling fs.rename()', function(done) {
      var fs = util.fs();
      var newfilename = filename + '1';

      createTree(function() {
        stat(filename, function(stats1) {

          fs.rename(filename, newfilename, function(error) {
            if(error) throw error;

            stat(newfilename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update ctime, mtime, atime when calling fs.truncate()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {

          fs.truncate(filename, 5, function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update ctime, mtime, atime when calling fs.ftruncate()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {

          fs.open(filename, 'w', function(error, fd) {
            if(error) throw error;

            fs.ftruncate(fd, 5, function(error) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.be.at.least(stats1.ctime);
                expect(stats2.mtime).to.be.at.least(stats1.mtime);
                expect(stats2.atime).to.be.at.least(stats1.atime);

                fs.close(fd, done);
              });
            });
          });
        });
      });
    });

    it('should make no change when calling fs.stat()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {

          fs.stat(filename, function(error, stats2) {
            if(error) throw error;

            expect(stats2.ctime).to.equal(stats1.ctime);
            expect(stats2.mtime).to.equal(stats1.mtime);
            expect(stats2.atime).to.equal(stats1.atime);
            done();
          });
        });
      });
    });

    it('should make no change when calling fs.fstat()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {

          fs.open(filename, 'w', function(error, fd) {
            if(error) throw error;

            fs.fstat(fd, function(error, stats2) {
              if(error) throw error;

              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);

              fs.close(fd, done);
            });
          });
        });
      });
    });

    it('should make no change when calling fs.lstat()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.link(filename, '/link', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.lstat('/link', function(error, stats2) {
              if(error) throw error;

              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should make no change when calling fs.exists()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {

          fs.exists(filename, function(exists) {
            expect(exists).to.be.true;

            fs.stat(filename, function(error, stats2) {
              if(error) throw error;

              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update ctime, atime when calling fs.link()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.link(filename, '/link', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should make no change when calling fs.symlink()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.symlink(filename, '/link', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should make no change when calling fs.readlink()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.symlink(filename, '/link', function(error) {
          if(error) throw error;

          stat('/link', function(stats1) {
            fs.readlink('/link', function(error, contents) {
              if(error) throw error;
              expect(contents).to.equal(filename);

              stat('/link', function(stats2) {
                expect(stats2.ctime).to.equal(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.equal(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });

    it('should update ctime, atime, mtime of parent dir when calling fs.unlink()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(dirname, function(stats1) {
          fs.unlink(filename, function(error) {
            if(error) throw error;

            stat(dirname, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update ctime, atime, mtime of parent dir when calling fs.rmdir()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat('/', function(stats1) {

          fs.unlink(filename, function(error) {
            if(error) throw error;

            fs.rmdir(dirname, function(error) {
              if(error) throw error;

              stat('/', function(stats2) {
                expect(stats2.ctime).to.be.at.least(stats1.ctime);
                expect(stats2.mtime).to.be.at.least(stats1.mtime);
                expect(stats2.atime).to.be.at.least(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });

    it('should update ctime, atime, mtime of parent dir when calling fs.mkdir()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat('/', function(stats1) {

          fs.mkdir('/a', function(error) {
            if(error) throw error;

            stat('/', function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should make no change when calling fs.close()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.close(fd, function(error) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.equal(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.equal(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });

    it('should make no change when calling fs.open()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.open(filename, 'w', function(error, fd) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);

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
      var fs = util.fs();
      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      createTree(function() {
        fs.open('/myfile', 'w', function(err, fd) {
          if(err) throw error;

          stat('/myfile', function(stats1) {
            fs.write(fd, buffer, 0, buffer.length, 0, function(err, nbytes) {
              if(err) throw error;

              fs.close(fd, function(error) {
                if(error) throw error;

                stat('/myfile', function(stats2) {
                  expect(stats2.ctime).to.be.at.least(stats1.ctime);
                  expect(stats2.mtime).to.be.at.least(stats1.mtime);
                  expect(stats2.atime).to.be.at.least(stats1.atime);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should make no change when calling fs.read()', function(done) {
      var fs = util.fs();
      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      createTree(function() {
        fs.open('/myfile', 'w', function(err, fd) {
          if(err) throw err;

          fs.write(fd, buffer, 0, buffer.length, 0, function(err, nbytes) {
            if(err) throw err;

            fs.close(fd, function(error) {
              if(error) throw error;

              fs.open('/myfile', 'r', function(error, fd) {
                if(error) throw error;

                stat('/myfile', function(stats1) {
                  var buffer2 = new Uint8Array(buffer.length);
                  fs.read(fd, buffer2, 0, buffer2.length, 0, function(err, nbytes) {

                    fs.close(fd, function(error) {
                      if(error) throw error;

                      stat('/myfile', function(stats2) {
                        expect(stats2.ctime).to.equal(stats1.ctime);
                        expect(stats2.mtime).to.equal(stats1.mtime);
                        expect(stats2.atime).to.equal(stats1.atime);
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
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.readFile(filename, function(error, data) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.equal(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.equal(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update atime, ctime, mtime when calling fs.writeFile()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.writeFile(filename, 'data', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update atime, ctime, mtime when calling fs.appendFile()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.appendFile(filename, '...more data', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.be.at.least(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update ctime, atime when calling fs.setxattr()', function(done) {
      var fs = util.fs();

      createTree(function() {
        stat(filename, function(stats1) {
          fs.setxattr(filename, 'extra', 'data', function(error) {
            if(error) throw error;

            stat(filename, function(stats2) {
              expect(stats2.ctime).to.be.at.least(stats1.ctime);
              expect(stats2.mtime).to.equal(stats1.mtime);
              expect(stats2.atime).to.be.at.least(stats1.atime);
              done();
            });
          });
        });
      });
    });

    it('should update ctime, atime when calling fs.fsetxattr()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.fsetxattr(fd, 'extra', 'data', function(error) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.be.at.least(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.be.at.least(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });

    it('should make no change when calling fs.getxattr()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.setxattr(filename, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.getxattr(filename, 'extra', function(error, value) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.equal(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.equal(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });

    it('should make no change when calling fs.fgetxattr()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.fsetxattr(fd, 'extra', 'data', function(error) {
            if(error) throw error;

            stat(filename, function(stats1) {
              fs.fgetxattr(fd, 'extra', function(error, value) {
                if(error) throw error;

                stat(filename, function(stats2) {
                  expect(stats2.ctime).to.equal(stats1.ctime);
                  expect(stats2.mtime).to.equal(stats1.mtime);
                  expect(stats2.atime).to.equal(stats1.atime);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should update ctime, atime when calling fs.removexattr()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.setxattr(filename, 'extra', 'data', function(error) {
          if(error) throw error;

          stat(filename, function(stats1) {
            fs.removexattr(filename, 'extra', function(error) {
              if(error) throw error;

              stat(filename, function(stats2) {
                expect(stats2.ctime).to.be.at.least(stats1.ctime);
                expect(stats2.mtime).to.equal(stats1.mtime);
                expect(stats2.atime).to.be.at.least(stats1.atime);
                done();
              });
            });
          });
        });
      });
    });

    it('should update ctime, atime when calling fs.fremovexattr()', function(done) {
      var fs = util.fs();

      createTree(function() {
        fs.open(filename, 'w', function(error, fd) {
          if(error) throw error;

          fs.fsetxattr(fd, 'extra', 'data', function(error) {
            if(error) throw error;

            stat(filename, function(stats1) {
              fs.fremovexattr(fd, 'extra', function(error) {
                if(error) throw error;

                stat(filename, function(stats2) {
                  expect(stats2.ctime).to.be.at.least(stats1.ctime);
                  expect(stats2.mtime).to.equal(stats1.mtime);
                  expect(stats2.atime).to.be.at.least(stats1.atime);
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
