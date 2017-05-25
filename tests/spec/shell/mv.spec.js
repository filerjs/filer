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

  it('should fail when source argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.mv(null, null, function(error) {
      expect(error).to.exist;
      done();
    });
  });

  it('should fail when destination argument is absent', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.writeFile('/file', contents, function(error) {
    	if(error) throw error;

      shell.mv('/file', null, function(error) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should fail when source argument is an empty string', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    shell.mv('', '/file', function(error) {
      expect(error).to.exist;
      done();
    });
  });

  it('should fail when destination argument is an empty string', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = 'a';

    fs.writeFile('/file', contents, function(error) {
      if(error) throw error;
      shell.mv('/file', '', function(error) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should fail when the node at source path does not exist', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(error) {
      if(error) throw error;
      shell.mv('/file', '/dir', function(error) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should fail when root is provided as source argument', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(error) {
      if(error) throw error;
      shell.mv('/', '/dir', function(error) {
        expect(error).to.exist;
        done();
      });
    });
  });

  it('should fail when node at source path is a folder, but node at destination is a file', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.mkdir ('/dir', function(error) {
      if(error) throw error;

      fs.writeFile('/file', contents, function(error) {
        if(error) throw error;

        shell.mv('/dir', '/file', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('EINVAL');
          done();
        });
      });
    });
  });

  it('should rename a file which is moved to the same directory under a different name', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.writeFile('/file', contents, function(error) {
      if(error) throw error;

      shell.mv('/file', '/newfile', function(error) {
        if(error) throw error;

        fs.stat('/file', function(error, stats) {
          expect(error).to.exist;
          expect(stats).not.to.exist;

          fs.readFile('/newfile', 'utf8', function(error, data) {
            expect(error).not.to.exist;
            expect(data).to.equal(contents);
            done();
          });
        });
      });
    });
  });

  it('should rename a symlink which is moved to the same directory under a different name', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.writeFile('/file', contents, function(error) {
      if(error) throw error;

      fs.symlink('/file', '/newfile', function(error) {
        if(error) throw error;

        shell.mv('/newfile', '/newerfile', function(error) {
          expect(error).not.to.exist;

          fs.stat('/file', function(error, stats) {
            expect(error).not.to.exist;

            fs.stat('/newfile', function(error, stats) {
              expect(error).to.exist;

              fs.readFile('/newerfile', 'utf8', function(error, data) {
                expect(error).not.to.exist;
                expect(data).to.equal(contents);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should move a file into an empty directory', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.writeFile('/file', contents, function(error) {
        if(error) throw error;

        shell.mv('/file', '/dir', function(error) {
          expect(error).to.not.exist;

          fs.stat('/file', function(error, stats) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOENT');

            fs.readFile('/dir/file', 'utf8', function(error, data) {
              expect(error).not.to.exist;
              expect(data).to.equal(contents);
              done();
            });
          });
        });
      });
    });
  });

  it('should move a file into a directory that has a file of the same name', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";
    var contents2 = "b";

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.writeFile('/file', contents, function(error) {
        if(error) throw error;

        fs.writeFile('/dir/file', contents2, function(error) {
          if(error) throw error;

          shell.mv('/file', '/dir/file', function(error) {
            expect(error).to.not.exist;

            fs.stat('/file', function(error, stats) {
              expect(error).to.exist;
              expect(error.code).to.equal('ENOENT');

              fs.readFile('/dir/file', 'utf8', function(error, data) {
                expect(error).not.to.exist;
                expect(data).to.equal(contents);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should move an empty directory to another empty directory', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.mkdir('/otherdir', function(error) {
        if(error) throw error;

        shell.mv('/dir', '/otherdir', function(error) {
          expect(error).to.not.exist;

          fs.stat('/dir', function(error, stats) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOENT');

            fs.stat('/otherdir/dir', function(error, stats) {
              expect(error).to.not.exist;
              expect(stats).to.exist;
              done();
            });
          });
        });
      });
    });
  });

  it('should move an empty directory to a populated directory', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.mkdir('/otherdir', function(error) {
        if(error) throw error;

        fs.writeFile('/otherdir/file', contents, function(error) {
          if(error) throw error;

          shell.mv('/dir', '/otherdir', function(error) {
            expect(error).to.not.exist;

            fs.stat('/dir', function(error, stats) {
              expect(error).to.exist;
              expect(error.code).to.equal('ENOENT');

              fs.stat('/otherdir/file', function(error, stats) {
                expect(error).to.not.exist;
                expect(stats).to.exist;

                fs.stat('/otherdir/dir', function(error, stats) {
                  expect(error).to.not.exist;
                  expect(stats).to.exist;
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should move a populated directory to a populated directory', function(done) {
    var fs = util.fs();
    var shell = new fs.Shell();
    var contents = "a";
    var contents2 = "b";

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.mkdir('/otherdir', function(error) {
        if(error) throw error;

        fs.writeFile('/otherdir/file', contents, function(error) {
          if(error) throw error;

          fs.writeFile('/dir/file', contents2, function(error) {
            if(error) throw error;

            shell.mv('/dir', '/otherdir', function(error) {
              expect(error).to.not.exist;

              fs.stat('/dir', function(error, stats) {
                expect(error).to.exist;
                expect(error.code).to.equal('ENOENT');

                fs.readFile('/otherdir/file', 'utf8', function(error, data) {
                  expect(error).to.not.exist;
                  expect(data).to.equal(contents);

                  fs.stat('/otherdir/dir', function(error, stats) {
                    expect(error).to.not.exist;
                    expect(stats).to.exist;

                    fs.readFile('/otherdir/dir/file', 'utf8', function(error, data) {
                      expect(error).to.not.exist;
                      expect(data).to.equal(contents2);
                      done();
                    })
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
