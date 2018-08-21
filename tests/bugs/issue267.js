var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readdir on non-dir paths, issue 267', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with ENOTDIR when called on filepath', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile.txt', 'data', function(err) {
      if(err) throw err;

      fs.readdir('/myfile.txt', function(err, contents) {
        expect(err).to.exist;
        expect(err.code).to.equal('ENOTDIR');
        expect(contents).not.to.exist;
        done();
      });
    });
  });
});
