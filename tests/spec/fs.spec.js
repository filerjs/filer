'use strict';

let Filer = require('../../src');
let util = require('../lib/test-utils.js');
let expect = require('chai').expect;

describe('fs', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('is an object', function() {
    let fs = util.fs();
    expect(typeof fs).to.equal('object');
    expect(fs).to.be.an.instanceof(Filer.FileSystem);
  });

  it('should have a root directory', function(done) {
    let fs = util.fs();
    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.isDirectory()).to.be.true;
      done();
    });
  });
});
