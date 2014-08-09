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

describe('Filer.Buffer static methods are in tact, issue 249', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should proxy Buffer.isBuffer', function(done) {
    expect(Filer.Buffer.isBuffer(new Filer.Buffer([]))).to.equal(true);
    expect(Filer.Buffer.isBuffer('')).to.equal(false);
    done();
  });

  it('should proxy Buffer.isEncoding', function(done) {
    expect(Filer.Buffer.isEncoding('utf8')).to.equal(true);
    expect(Filer.Buffer.isEncoding('smoop')).to.equal(false);
    done();
  });

  it('should proxy Buffer.byteLength', function(done) {
    expect(Filer.Buffer.byteLength('01100111', 'binary')).to.equal(8);
    done();
  });

  it('should proxy Buffer.concat', function(done) {
    expect(Filer.Buffer.concat([new Filer.Buffer(1), new Filer.Buffer(2)]).length).to.equal(3);
    done();
  });
});

