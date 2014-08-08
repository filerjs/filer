var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('Filer.Buffer should accept initialized ArrayBuffers, issue 249', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should accept an ArrayBuffer with a specified size', function(done) {
    var buffer = new Filer.Buffer(new ArrayBuffer(5));
    expect(buffer.length).to.equal(5);
    done();
  });
});
