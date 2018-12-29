var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.read', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.read).to.be.a('function');
  });

  it('should read data from a file', function(done) {
    var fs = util.fs();
    var wbuffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = Buffer.alloc(wbuffer.length);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;
        expect(result).to.equal(wbuffer.length);

        fs.read(fd, rbuffer, 0, rbuffer.length, 0, function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(rbuffer.length);
          expect(wbuffer).to.deep.equal(rbuffer);
          fs.close(fd, done);
        });
      });
    });
  });

  it('should update the current file position', function(done) {
    var fs = util.fs();
    var wbuffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = Buffer.alloc(wbuffer.length);
    var _result = 0;

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;
        expect(result).to.equal(wbuffer.length);

        fs.read(fd, rbuffer, 0, rbuffer.length / 2, undefined, function(error, result) {
          if(error) throw error;

          _result += result;
          fs.read(fd, rbuffer, rbuffer.length / 2, rbuffer.length, undefined, function(error, result) {
            if(error) throw error;
            _result += result;
            expect(error).not.to.exist;
            expect(_result).to.equal(rbuffer.length);
            expect(wbuffer).to.deep.equal(rbuffer);
            fs.close(fd, done);
          });
        });
      });
    });
  });

  it('should fail to read a directory', function(done) {
    var fs = util.fs();
    var buf = Buffer.alloc(20);
    var buf2 = Buffer.alloc(20);

    fs.mkdir('/mydir', function(error) {
      if(error) throw error;

      fs.open('/mydir', 'r', function(error, fd) {
        if(error) throw error;

        fs.read(fd, buf, 0, buf.length, 0, function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal('EISDIR');
          expect(result).to.equal(0);
          expect(buf).to.deep.equal(buf2);
          fs.close(fd, done);
        });
      });
    });
  });

  it('should fail to read a file that does not exist', function(done) {
    var fs = util.fs();

    var fd = 0;
    var rbuffer = Buffer.alloc(8);

    fs.read(fd, rbuffer, 0, rbuffer.length, 0, function(error, result) {
      expect(error).to.exist;
      expect(result).not.to.exist;
      expect(error.code).to.equal('EBADF');
      done();
    });
  });
});
