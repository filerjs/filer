var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.rename', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.rename).to.be.a('function');
  });

  it('should rename an existing file', function(done) {
    var complete1 = false;
    var complete2 = false;
    var fs = util.fs();

    function maybeDone() {
      if(complete1 && complete2) {
        done();
      }
    }

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.rename('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          fs.stat('/myfile', function(error, result) {
            expect(error).to.exist;
            expect(result).not.to.exist;
            complete1 = true;
            maybeDone();
          });

          fs.stat('/myotherfile', function(error, result) {
            expect(error).not.to.exist;
            expect(result.nlinks).to.equal(1);
            complete2 = true;
            maybeDone();
          });
        });
      });
    });
  });

  it('should rename an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.rename('/mydir', '/myotherdir', function(error) {
        expect(error).not.to.exist;
        fs.stat('/mydir', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');

          fs.stat('/myotherdir', function(error, result) {
            expect(error).not.to.exist;
            expect(result.nlinks).to.equal(1);
            done();
          });
        });
      });
    });
  });

  it('should rename an existing directory if the new path points to an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.mkdir('/myotherdir', function(error) {
        if(error) throw error;

        fs.rename('/mydir', '/myotherdir', function(error) {
          expect(error).not.to.exist;
          fs.stat('/mydir', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOENT');

            fs.stat('/myotherdir', function(error, result) {
              expect(error).not.to.exist;
              expect(result.nlinks).to.equal(1);
              done();
            });
          });
        });
      });
    });
  });

  it('should fail to rename an existing directory if the new path points to an existing directory that is not empty', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.mkdir('/myotherdir', function(error) {
        if(error) throw error;

        fs.writeFile('/myotherdir/myfile', 'This is a file', function(error) {
          if(error) throw error;

          fs.rename('/mydir', '/myotherdir', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOTEMPTY');

            fs.stat('/mydir', function(error) {
              expect(error).not.to.exist;

              fs.stat('/myotherdir', function(error) {
                expect(error).not.to.exist;
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should fail to rename an existing directory if the new path points to an existing file', function(done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.writeFile('/myfile', 'This is a file', function(error) {
        if(error) throw error;

        fs.rename('/mydir', '/myfile', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOTDIR');

          fs.stat('/mydir', function(error) {
            expect(error).not.to.exist;

            fs.stat('/myfile', function(error) {
              expect(error).not.to.exist;
              done();
            });
          });
        });
      });
    });
  });
});
