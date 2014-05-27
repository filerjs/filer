var Filer = require('../..');
var expect = require('chai').expect;

describe("Filer", function() {
  it("is defined", function() {
    expect(typeof Filer).not.to.equal(undefined);
  });

  it("has FileSystem constructor", function() {
    expect(typeof Filer.FileSystem).to.equal('function');
  });
});
