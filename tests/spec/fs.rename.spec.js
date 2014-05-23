var Filer = require('../..');
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
});
