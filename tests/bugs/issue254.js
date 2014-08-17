var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readFile on a dir path', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with EISDIR', function(done) {
    var fs = util.fs();

    fs.readFile('/', function(err) {
      expect(err.code).to.equal('EISDIR');
      done();
    });
  });
});
