var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.writeFile and non-existing directory, issue 239', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should give ENOENT if writing to a dir that does not exist', function(done) {
    var fs = util.fs();

    fs.writeFile('/abc.txt', 'content', function(err) {
      expect(err).not.to.exist;

      fs.writeFile('/abc.txt/abc.txt', 'content', function(err) {
        expect(err.code).to.equal('ENOENT');
        done();
      });
    });
  });
});
