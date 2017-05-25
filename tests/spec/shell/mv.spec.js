var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.mv', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.mv).to.be.a('function');
  });

  it('should fail when the source argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.mv(null, '/destination', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      done();
    });
  });

  it('should fail when the source argument is the root', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.mv('/', '/destination', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      done();
    });
  });

  it('should fail when the destination argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.mv('/source', null, function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      done();
    });
  });

  describe('on files', function() {
    it('should move a single file when the basename of the destination is specified', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.writeFile('/file', contents, function(err) {
          if(err) throw err;

          shell.mv('/file', '/dir/file', function(err) {
            expect(err).not.to.exist;

            fs.stat('/dir/file', function(err, stats) {
              expect(err).not.to.exist;
              expect(stats).to.exist;

              fs.stat('/file', function(err, stats) {
                expect(err).to.exist;
                expect(stats).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });

    it('should move a single file when a basename isn\'t specified in the destination', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.writeFile('/file', contents, function(err) {
          if(err) throw err;

          shell.mv('/file', '/dir/', function(err) {
            expect(err).not.to.exist;

            fs.stat('/dir/file', function(err, stats) {
              expect(err).not.to.exist;
              expect(stats).to.exist;

              fs.stat('/file', function(err, stats) {
                expect(err).to.exist;
                expect(stats).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });

    it('should move multiple files when the destination is a path to a folder', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.writeFile('/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/file2', contents + 1, function(err) {
            if(err) throw err;

            shell.mv(['/file', '/file2'], '/dir/', function(err) {
              expect(err).not.to.exist;

              fs.stat('/dir/file', function(err, stats) {
                expect(err).not.to.exist;
                expect(stats).to.exist;

                fs.stat('/dir/file2', function(err, stats) {
                  expect(err).not.to.exist;
                  expect(stats).to.exist;

                  fs.stat('/file', function(err, stats) {
                    expect(err).to.exist;
                    expect(stats).not.to.exist;

                    fs.stat('/file2', function(err, stats) {
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
    });

    it('should fail to move a single file when the basename of the destination is the name of a folder', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.writeFile('/file', contents, function(err) {
          if(err) throw err;

          shell.mv('/file', '/dir', function(err) {
            expect(err).to.exist;
            done();
          });
        });
      });
    });
  });

  describe('on folders', function(){
    it('should move an empty folder when the basename of the destination is specified', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.mkdir('/dir2', function(err) {
          if(err) throw err;

          shell.mv('/dir2', '/dir/dir2', function(err) {
            expect(err).not.to.exist;

            fs.stat('/dir/dir2', function(err, stats) {
              expect(err).not.to.exist;
              expect(stats).to.exist;

              fs.stat('/dir2', function(err, stats) {
                expect(err).to.exist;
                expect(stats).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });

    it('should move an empty folder when the basename of the destination isn\'t specified', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.mkdir('/dir2', function(err) {
          if(err) throw err;

          shell.mv('/dir2', '/dir/', function(err) {
            expect(err).not.to.exist;

            fs.stat('/dir/dir2', function(err, stats) {
              expect(err).not.to.exist;
              expect(stats).to.exist;

              fs.stat('/dir2', function(err, stats) {
                expect(err).to.exist;
                expect(stats).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });

    it('should move a non-empty folder when the basename of the destination is specified', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.mkdir('/dir2', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir2/file', contents, function(err){
            if(err) throw err;

            shell.mv('/dir2', '/dir/dir2', function(err) {
              expect(err).not.to.exist;

              fs.stat('/dir/dir2', function(err, stats) {
                expect(err).not.to.exist;
                expect(stats).to.exist;

                fs.stat('/dir/dir2/file', function(err, stats) {
                  expect(err).not.to.exist;
                  expect(stats).to.exist;

                  fs.stat('/dir2', function(err, stats) {
                    expect(err).to.exist;
                    expect(stats).not.to.exist;
                    done();
                  });
                })
              });
            });
          });
        });
      });
    });

    it('should move a non-empty folder when the basename of the destination isn\'t specified', function(done) {
      var fs = util.fs();
      var shell = new fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        fs.mkdir('/dir2', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir2/file', contents, function(err){
            if(err) throw err;

            shell.mv('/dir2', '/dir/', function(err) {
              expect(err).not.to.exist;

              fs.stat('/dir/dir2', function(err, stats) {
                expect(err).not.to.exist;
                expect(stats).to.exist;

                fs.stat('/dir/dir2/file', function(err, stats) {
                  expect(err).not.to.exist;
                  expect(stats).to.exist;

                  fs.stat('/dir2', function(err, stats) {
                    expect(err).to.exist;
                    expect(stats).not.to.exist;
                    done();
                  });
                })
              });
            });
          });
        });
      });
    });
  });

  describe('in combination, deep & wide', function() {
    // TBD
  });
});
