'use strict';

const Filer = require('../../src');
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('is an object', function() {
    const fs = util.fs();
    expect(typeof fs).to.equal('object');
    expect(fs).to.be.an.instanceof(Filer.FileSystem);
  });

  it('should have a root directory', function(done) {
    const fs = util.fs();
    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;
      expect(result.isDirectory()).to.be.true;
      done();
    });
  });
});
