var Filer = require('../../../src');
var expect = require('chai').expect;

describe('Filer.FileSystem.providers', function() {
  it('is defined', function() {
    expect(Filer.FileSystem.providers).to.exist;
  });

  it('has IndexedDB constructor', function() {
    expect(Filer.FileSystem.providers.IndexedDB).to.be.a('function');
  });

  it('has Memory constructor', function() {
    expect(Filer.FileSystem.providers.Memory).to.be.a('function');
  });

  it('has a Default constructor', function() {
    expect(Filer.FileSystem.providers.Default).to.be.a('function');
  });
});
