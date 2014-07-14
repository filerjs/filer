var Path = require('../..').Path;
var expect = require('chai').expect;

describe('Path.normalize and trailing slashes', function() {

  it('should remove trailing slashes as expected', function() {
    var strip = Path.normalize;

    expect(strip('/')).to.equal('/');
    expect(strip('/foo/')).to.equal('/foo');
    expect(strip('/foo//')).to.equal('/foo');
    expect(strip('/foo/bar/baz/')).to.equal('/foo/bar/baz');
  });

});
