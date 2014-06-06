var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.close', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.close).to.equal('function');
  });

  it('should release the file descriptor', function(done) {
    var buffer = new Filer.Buffer(0);
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, result) {
      if(error) throw error;

      var fd = result;
      fs.close(fd, function(error) {
        fs.read(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          expect(error).to.exist;
          done();
        });
      });
    });
  });
});
