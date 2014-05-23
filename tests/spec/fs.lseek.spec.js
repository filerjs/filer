var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.lseek', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.lseek).to.be.a('function');
  });

  it('should not follow symbolic links', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function (error, fd) {
      if (error) throw error;

      fs.close(fd, function (error) {
        if (error) throw error;

        fs.symlink('/myfile', '/myFileLink', function (error) {
          if (error) throw error;

          fs.rename('/myFileLink', '/myOtherFileLink', function (error) {
            if (error) throw error;

            fs.stat('/myfile', function (error, result) {
              expect(error).not.to.exist;

              fs.lstat('/myFileLink', function (error, result) {
                expect(error).to.exist;

                fs.stat('/myOtherFileLink', function (error, result) {
                  if (error) throw error;
                  expect(result.nlinks).to.equal(1);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should set the current position if whence is SET', function(done) {
    var fs = util.fs();
    var offset = 3;
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var result_buffer = new Uint8Array(buffer.length + offset);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;

        fs.lseek(fd, offset, 'SET', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(offset);

          fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
            if(error) throw error;

            fs.read(fd, result_buffer, 0, result_buffer.length, 0, function(error, result) {
              if(error) throw error;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(offset + buffer.length);
                var expected = new Uint8Array([1, 2, 3, 1, 2, 3, 4, 5, 6, 7, 8]);
                expect(result_buffer).to.deep.equal(expected);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update the current position if whence is CUR', function(done) {
    var fs = util.fs();
    var offset = -2;
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var result_buffer = new Uint8Array(2 * buffer.length + offset);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;

        fs.lseek(fd, offset, 'CUR', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(offset + buffer.length);

          fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
            if(error) throw error;

            fs.read(fd, result_buffer, 0, result_buffer.length, 0, function(error, result) {
              if(error) throw error;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(offset + 2 * buffer.length);
                var expected = new Uint8Array([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 8]);
                expect(result_buffer).to.deep.equal(expected);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should update the current position if whence is END', function(done) {
    var fs = util.fs();
    var offset = 5;
    var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var result_buffer;

    fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd1 = result;
      fs.write(fd1, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;

        fs.open('/myfile', 'w+', function(error, result) {
          if(error) throw error;

          var fd2 = result;
          fs.lseek(fd2, offset, 'END', function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.equal(offset + buffer.length);

            fs.write(fd2, buffer, 0, buffer.length, undefined, function(error, result) {
              if(error) throw error;

              fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                expect(result.size).to.equal(offset + 2 * buffer.length);
                result_buffer = new Uint8Array(result.size);
                fs.read(fd2, result_buffer, 0, result_buffer.length, 0, function(error, result) {
                  if(error) throw error;
                  var expected = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
                  expect(result_buffer).to.deep.equal(expected);
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
