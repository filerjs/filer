'use strict'; 

const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.close', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(typeof fs.close).to.equal('function');
  });

  it('should release the file descriptor', function(done) {
    const buffer = Buffer.alloc(0);
    const fs = util.fs();

    fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      const fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;

        fs.read(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          expect(error).to.exist;
          expect(error.code).to.equal('EBADF');
          expect(result).not.to.exist;
          done();
        });
      });
    });
  });
});
