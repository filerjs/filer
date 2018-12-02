var Filer = require('../../src');
var expect = require('chai').expect;

describe('Filer.Buffer', function() {

  it('should support .from()', function() {
    expect(Filer.Buffer.from).to.be.a('function');
  });

  it('should support .alloc()', function() {
    expect(Filer.Buffer.alloc).to.be.a('function');
  });

  it('should support .isBuffer()', function() {
    var buf = Buffer.alloc(0);
    expect(Buffer.isBuffer(buf)).to.be.true;
  });

  describe('Deprecation checks - constructor vs. class method init', function() {

    it('should allow new Buffer(array)', function() {
      var arr = [1, 2, 3];
      var buf1 = new Buffer(arr);
      var buf2 = new Buffer.from(arr);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(ArrayBuffer)', function() {
      var arrayBuffer = (new Uint8Array([1, 2, 3])).buffer;
      var buf1 = new Buffer(arrayBuffer);
      var buf2 = Buffer.from(arrayBuffer);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(ArrayBuffer)', function() {
      var buffer = new Buffer.from([1, 2, 3]);
      var buf1 = new Buffer(buffer);
      var buf2 = Buffer.from(buffer);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(string)', function() {
      var s = 'Hello World';
      var buf1 = new Buffer(s);
      var buf2 = Buffer.from(s);
      expect(buf1).to.deep.equal(buf2);
    });
  });
});
