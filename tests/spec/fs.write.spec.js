var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.write', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.write).to.be.a('function');
  });

  it('should write data to a file', function(done) {
    var fs = util.fs();
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.equal(buffer.length);

        fs.stat('/myfile', function(error, result) {
          expect(error).not.to.exist;
          expect(result.type).to.equal('FILE');
          expect(result.size).to.equal(buffer.length);
          done();
        });
      });
    });
  });

  it('should update the current file position', function(done) {
    var fs = util.fs();
    var buffer = new Filer.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
    var _result = 0;

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
        if(error) throw error;
        _result += result;

        fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;
          _result += result;

          fs.stat('/myfile', function(error, result) {
            if(error) throw error;
            expect(error).not.to.exist;
            expect(_result).to.equal(2 * buffer.length);
            expect(result.size).to.equal(_result);
            done();
          });
        });
      });
    });
  });
});
