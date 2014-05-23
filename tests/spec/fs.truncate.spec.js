var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.truncate', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.truncate).to.be.a('function');
  });

  it('should error when length is negative', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;

      fs.truncate('/myfile', -1, function(error) {
        expect(error).to.exist;
        expect(error.code).to.equal("EINVAL");
        done();
      });
    });
  });

  it('should error when path is not a file', function(done) {
    var fs = util.fs();

    fs.truncate('/', 0, function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal("EISDIR");
      done();
    });
  });

  it('should truncate a file', function(done) {
    var fs = util.fs();
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var truncated = new Uint8Array([1]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.truncate('/myfile', 1, function(error) {
            expect(error).not.to.exist;

            fs.readFile('/myfile', function(error, result) {
              if(error) throw error;

              expect(result).to.deep.equal(truncated);
              done();
            });
          });
        });
      });
    });
  });

  it('should pad a file with zeros when the length is greater than the file size', function(done) {
    var fs = util.fs();
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var truncated = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 0]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.truncate('/myfile', 9, function(error) {
            expect(error).not.to.exist;

            fs.readFile('/myfile', function(error, result) {
              if(error) throw error;

              expect(result).to.deep.equal(truncated);
              done();
            });
          });
        });
      });
    });
  });

  it('should update the file size', function(done) {
    var fs = util.fs();
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.truncate('/myfile', 0, function(error) {
            expect(error).not.to.exist;

            fs.stat('/myfile', function(error, result) {
              if(error) throw error;

              expect(result.size).to.equal(0);
              done();
            });
          });
        });
      });
    });
  });

  it('should truncate a valid descriptor', function(done) {
    var fs = util.fs();
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.ftruncate(fd, 0, function(error) {
          expect(error).not.to.exist;

          fs.fstat(fd, function(error, result) {
            if(error) throw error;

            expect(result.size).to.equal(0);
            done();
          });
        });
      });
    });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.close(fd, function(error) {
          if(error) throw error;

          fs.symlink('/myfile', '/mylink', function(error) {
            if(error) throw error;

            fs.truncate('/mylink', 0, function(error) {
              expect(error).not.to.exist;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(0);
                fs.lstat('/mylink', function(error, result) {
                  if(error) throw error;

                  expect(result.size).not.to.equal(0);
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
