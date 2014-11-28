var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('path resolution', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should follow a symbolic link to the root directory', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/mydirectorylink', function(error) {
      if(error) throw error;

      fs.stat('/', function(error, result) {
        if(error) throw error;

        expect(result['node']).to.exist;
        var _node = result['node'];

        fs.stat('/mydirectorylink', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.exist;
          expect(result['node']).to.equal(_node);
          done();
        });
      });
    });
  });

  it('should follow a symbolic link to a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      fs.symlink('/mydir', '/mydirectorylink', function(error) {
        if(error) throw error;

        fs.stat('/mydir', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          var _node = result['node'];
          fs.stat('/mydirectorylink', function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.exist;
            expect(result['node']).to.equal(_node);
            done();
          });
        });
      });
    });
  });

  it('should follow a symbolic link to a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          var _node = result['node'];
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;

            fs.stat('/myfilelink', function(error, result) {
              expect(error).not.to.exist;
              expect(result).to.exist;
              expect(result['node']).to.equal(_node);
              done();
            });
          });
        });
      });
    });
  });

  it('should follow multiple symbolic links to a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          var _node = result['node'];
          fs.symlink('/myfile', '/myfilelink1', function(error) {
            if(error) throw error;
            fs.symlink('/myfilelink1', '/myfilelink2', function(error) {
              if(error) throw error;

              fs.stat('/myfilelink2', function(error, result) {
                expect(error).not.to.exist;
                expect(result).to.exist;
                expect(result['node']).to.equal(_node);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should error if symbolic link leads to itself', function(done) {
    var fs = util.fs();

    fs.symlink('/mylink1', '/mylink2', function(error) {
      if(error) throw error;

      fs.symlink('/mylink2', '/mylink1', function(error) {
        if(error) throw error;

        fs.stat('/myfilelink1', function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal("ENOENT");
          expect(result).not.to.exist;
          done();
        });
      });
    });
  });

  it('should error if it follows more than 10 symbolic links', function(done) {
    var fs = util.fs();
    var nlinks = 11;

    function createSymlinkChain(n, callback) {
      if(n > nlinks) {
        return callback();
      }

      fs.symlink('/myfile' + (n-1), '/myfile' + n, createSymlinkChain.bind(this, n+1, callback));
    }

    fs.open('/myfile0', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile0', function(error, result) {
          if(error) throw error;

          createSymlinkChain(1, function() {
            fs.stat('/myfile11', function(error, result) {
              expect(error).to.exist;
              expect(error.code).to.equal('ELOOP');
              expect(result).not.to.exist;
              done();
            });
          });

        });
      });
    });
  });

  it('should follow a symbolic link in the path to a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          var _node = result['node'];
          fs.symlink('/', '/mydirlink', function(error) {
            if(error) throw error;

            fs.stat('/mydirlink/myfile', function(error, result) {
              expect(result).to.exist;
              expect(error).not.to.exist;
              expect(_node).to.exist;
              expect(result['node']).to.equal(_node);
              done();
            });
          });
        });
      });
    });
  });

  it('should error if a symbolic link in the path to a file is itself a file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          fs.open('/myfile2', 'w', function(error, result) {
            if(error) throw error;
            var fd = result;
            fs.close(fd, function(error) {
              if(error) throw error;
              fs.symlink('/myfile2', '/mynotdirlink', function(error) {
                if(error) throw error;

                fs.stat('/mynotdirlink/myfile', function(error, result) {
                  expect(error).to.exist;
                  expect(error.code).to.equal("ENOTDIR");
                  expect(result).not.to.exist;
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should properly add trailing slashes with Path.addTrailing()', function() {
    var Path = Filer.Path;
    expect(Path.addTrailing('/')).to.equal('/');
    expect(Path.addTrailing('/////')).to.equal('/');
    expect(Path.addTrailing('.')).to.equal('./');
    expect(Path.addTrailing('/dir')).to.equal('/dir/');
    expect(Path.addTrailing('/dir/')).to.equal('/dir/');
  });

  it('should properly remove trailing slashes with Path.removeTrailing()', function() {
    var Path = Filer.Path;
    expect(Path.removeTrailing('/')).to.equal('/');
    expect(Path.removeTrailing('/////')).to.equal('/');
    expect(Path.removeTrailing('./')).to.equal('.');
    expect(Path.removeTrailing('/dir/')).to.equal('/dir');
    expect(Path.removeTrailing('/dir//')).to.equal('/dir');
  });
});
