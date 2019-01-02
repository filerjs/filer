var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('undefined and relative paths, issue270', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with EINVAL when called on an undefined path', function() {
    var fs = util.fs();
    var fn = () => fs.writeFile(undefined, 'data');
    expect(fn).to.throw();
  });

  it('should fail with EINVAL when called on a relative path', function() {
    var fs = util.fs();
    var fn = () => fs.writeFile('relpath/file.txt', 'data');
    expect(fn).to.throw();
  });
});
