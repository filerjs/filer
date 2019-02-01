'use strict';

const Filer = require('../../src');
const expect = require('chai').expect;

describe('Filer.Buffer', function() {

  it('should support .from()', function() {
    expect(Filer.Buffer.from).to.be.a('function');
  });

  it('should support .alloc()', function() {
    expect(Filer.Buffer.alloc).to.be.a('function');
  });

  it('should support .isBuffer()', function() {
    const buf = Buffer.alloc(0);
    expect(Buffer.isBuffer(buf)).to.be.true;
  });

  describe('Deprecation checks - constructor vs. class method init', function() {

    it('should allow new Buffer(array)', function() {
      const arr = [1, 2, 3];
      const buf1 = new Buffer(arr);
      const buf2 = new Buffer.from(arr);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(ArrayBuffer)', function() {
      const arrayBuffer = (new Uint8Array([1, 2, 3])).buffer;
      const buf1 = new Buffer(arrayBuffer);
      const buf2 = Buffer.from(arrayBuffer);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(ArrayBuffer)', function() {
      const buffer = new Buffer.from([1, 2, 3]);
      const buf1 = new Buffer(buffer);
      const buf2 = Buffer.from(buffer);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(string)', function() {
      const s = 'Hello World';
      const buf1 = new Buffer(s);
      const buf2 = Buffer.from(s);
      expect(buf1).to.deep.equal(buf2);
    });
  });
});
