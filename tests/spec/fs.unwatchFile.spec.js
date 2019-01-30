const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

// Waiting on https://github.com/filerjs/filer/pull/553 to land
describe.skip('fs.unwatchFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(typeof fs.unwatchFile).to.equal('function');
  });

  it('should not throw an error when using a file not being watched', function() {
    const fs = util.fs();

    try {
      fs.unwatchFile('/myfile');
    } catch(e) {
      expect.fail('calling fs.unwatchFile() on a file should not throw');
    }
  });
});
