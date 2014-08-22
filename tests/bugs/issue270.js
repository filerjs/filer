var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('undefined and relative paths, issue270', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with EINVAL when called on an undefined path', function(done) {
    var fs = util.fs();

    fs.writeFile(undefined, 'data', function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });

  it('should fail with EINVAL when called on a relative path', function(done) {
    var fs = util.fs();

    fs.writeFile('relpath/file.txt', 'data', function(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EINVAL');
      done();
    });
  });
});
