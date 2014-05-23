var Filer = require('../..');
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
    var wbuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = new Uint8Array(wbuffer.length);

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;
      fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.read(fd, rbuffer, 0, rbuffer.length, 0, function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.equal(rbuffer.length);
          expect(wbuffer).to.deep.equal(rbuffer);
          done();
        });
      });
    });
  });

  it('should update the current file position', function(done) {
    var fs = util.fs();
    var wbuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var rbuffer = new Uint8Array(wbuffer.length);
    var _result = 0;

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
        if(error) throw error;

        fs.read(fd, rbuffer, 0, rbuffer.length / 2, undefined, function(error, result) {
          if(error) throw error;

          _result += result;
          fs.read(fd, rbuffer, rbuffer.length / 2, rbuffer.length, undefined, function(error, result) {
            if(error) throw error;
            _result += result;
            expect(error).not.to.exist;
            expect(_result).to.equal(rbuffer.length);
            expect(wbuffer).to.deep.equal(rbuffer);
            done();
          });
        });
      });
    });
  });
});
