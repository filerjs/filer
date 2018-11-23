var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.unwatchFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.unwatchFile).to.equal('function');
  });

  it('should not throw an error when using a file not being watched', function() {
    var fs = util.fs();
    fs.unwatchFile('/myfile', function(error){
      expect(error).not.to.exist;
    });
  });
});
