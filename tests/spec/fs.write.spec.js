'use strict';
let util = require('../lib/test-utils.js');
let expect = require('chai').expect;

describe('fs.write', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    let fs = util.fs();
    expect(fs.write).to.be.a('function');
  });

  it('should error if file path is undefined', function() {
    let fs = util.fs();
    let fn = () => fs.writeFile(undefined, 'data');
    expect(fn).to.throw();
  });

  it('should write data to a file', function(done) {
    let fs = util.fs();
    let buffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.equal(buffer.length);

        fs.stat('/myfile', function(error, result) {
          expect(error).not.to.exist;
          expect(result.isFile()).to.be.true;
          expect(result.size).to.equal(buffer.length);
          fs.close(fd, done);
        });
      });
    });
  });

  it('should update the current file position', function(done) {
    let fs = util.fs();
    let buffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    let _result = 0;

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
            fs.close(fd, done);
          });
        });
      });
    });
  });
});
