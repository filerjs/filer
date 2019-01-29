'use strict';
const Filer = require('../../src');
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

// Support global URL and node's url module
const URL = global.URL || require('url').URL;

describe('path resolution', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should follow a symbolic link to the root directory', function(done) {
    let fs = util.fs();

    fs.symlink('/', '/mydirectorylink', function(error) {
      if(error) throw error;

      fs.stat('/', function(error, result) {
        if(error) throw error;

        expect(result['node']).to.exist;
        let _node = result['node'];

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
    let fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.symlink('/mydir', '/mydirectorylink', function(error) {
        if(error) throw error;

        fs.stat('/mydir', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          let _node = result['node'];
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
    let fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      let fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          let _node = result['node'];
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
    let fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      let fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          let _node = result['node'];
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
    let fs = util.fs();

    fs.symlink('/mylink1', '/mylink2', function(error) {
      if(error) throw error;

      fs.symlink('/mylink2', '/mylink1', function(error) {
        if(error) throw error;

        fs.stat('/myfilelink1', function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');
          expect(result).not.to.exist;
          done();
        });
      });
    });
  });

  it('should error if it follows more than 10 symbolic links', function(done) {
    let fs = util.fs();
    let nlinks = 11;

    function createSymlinkChain(n, callback) {
      if(n > nlinks) {
        return callback();
      }

      fs.symlink('/myfile' + (n-1), '/myfile' + n, createSymlinkChain.bind(this, n+1, callback));
    }

    fs.open('/myfile0', 'w', function(error, result) {
      if(error) throw error;
      let fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile0', function(error, result) {
          if(error) throw error;
          expect(result).to.exist;

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
    let fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      let fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          let _node = result['node'];
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
    let fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      let fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;
          expect(result).to.exist;

          fs.open('/myfile2', 'w', function(error, result) {
            if(error) throw error;
            let fd = result;
            fs.close(fd, function(error) {
              if(error) throw error;
              fs.symlink('/myfile2', '/mynotdirlink', function(error) {
                if(error) throw error;

                fs.stat('/mynotdirlink/myfile', function(error, result) {
                  expect(error).to.exist;
                  expect(error.code).to.equal('ENOTDIR');
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
    let Path = Filer.Path;
    expect(Path.addTrailing('/')).to.equal('/');
    expect(Path.addTrailing('/////')).to.equal('/');
    expect(Path.addTrailing('.')).to.equal('./');
    expect(Path.addTrailing('/dir')).to.equal('/dir/');
    expect(Path.addTrailing('/dir/')).to.equal('/dir/');
  });

  it('should properly remove trailing slashes with Path.removeTrailing()', function() {
    let Path = Filer.Path;
    expect(Path.removeTrailing('/')).to.equal('/');
    expect(Path.removeTrailing('/////')).to.equal('/');
    expect(Path.removeTrailing('./')).to.equal('.');
    expect(Path.removeTrailing('/dir/')).to.equal('/dir');
    expect(Path.removeTrailing('/dir//')).to.equal('/dir');
  });

  it('should allow using Buffer for paths', function(done) {
    let fs = util.fs();
    let filePath = '/file';
    let bufferPath = Buffer.from(filePath);
    let data = 'data';

    fs.writeFile(bufferPath, data, function(err) {
      if(err) throw err;

      fs.readFile(filePath, 'utf8', function(err, result) {
        if(err) throw err;
        expect(result).to.equal(data);
        done();
      });
    });
  });

  it('should allow using file: URLs for paths', function(done) {
    let fs = util.fs();
    let filePath = '/file';
    let fileUrl = new URL(`file://${filePath}`);
    let data = 'data';

    fs.writeFile(fileUrl, data, function(err) {
      if(err) throw err;

      fs.readFile(filePath, 'utf8', function(err, result) {
        if(err) throw err;
        expect(result).to.equal(data);
        done();
      });
    });
  });

  it('should error for non file: URLs for paths', function() {
    let fs = util.fs();
    let fileUrl = new URL('http://file');
    let fn = () => fs.writeFile(fileUrl, 1);
    expect(fn).to.throw();
  });

  it('should error if file: URLs include escaped / characters', function() {
    let fs = util.fs();
    let fileUrl = new URL('file:///p/a/t/h/%2F');
    let fn = () => fs.writeFile(fileUrl, 1);
    expect(fn).to.throw();
  });
});
