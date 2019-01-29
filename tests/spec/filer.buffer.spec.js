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
    let buf = Buffer.alloc(0);
    expect(Buffer.isBuffer(buf)).to.be.true;
  });

  describe('Deprecation checks - constructor vs. class method init', function() {

    it('should allow new Buffer(array)', function() {
      let arr = [1, 2, 3];
      let buf1 = new Buffer(arr);
      let buf2 = new Buffer.from(arr);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(ArrayBuffer)', function() {
      let arrayBuffer = (new Uint8Array([1, 2, 3])).buffer;
      let buf1 = new Buffer(arrayBuffer);
      let buf2 = Buffer.from(arrayBuffer);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(ArrayBuffer)', function() {
      let buffer = new Buffer.from([1, 2, 3]);
      let buf1 = new Buffer(buffer);
      let buf2 = Buffer.from(buffer);
      expect(buf1).to.deep.equal(buf2);
    });

    it('should allow new Buffer(string)', function() {
      let s = 'Hello World';
      let buf1 = new Buffer(s);
      let buf2 = Buffer.from(s);
      expect(buf1).to.deep.equal(buf2);
    });
  });
});