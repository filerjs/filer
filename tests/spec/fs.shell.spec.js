'use strict';

const Filer = require('../../src');
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.Shell', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('is a function', function() {
    const fs = util.fs();
    expect(typeof fs.Shell).to.equal('function');
  });

  it('should return a FileSystemShell instance', function() {
    const fs = util.fs();
    const sh = new fs.Shell();

    expect(sh.prototype).to.deep.equal((new Filer.Shell(fs)).prototype);
  });

  it('should reflect changes to the prototype', function(){
    const fs = util.fs();
    const sh = new fs.Shell();

    Filer.Shell.prototype.test = 'foo';

    expect(sh.test).to.equal('foo');
  });
});
