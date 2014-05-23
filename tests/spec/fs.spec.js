var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe("fs", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it("is an object", function() {
    var fs = util.fs();
    expect(typeof fs).to.equal('object');
    expect(fs).to.be.an.instanceof(Filer.FileSystem);
  });

  it('should have a root directory', function(done) {
    var fs = util.fs();
    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.type).to.equal('DIRECTORY');
      done();
    });
  });
});
