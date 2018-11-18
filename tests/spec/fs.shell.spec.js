var Filer = require('../../src');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.Shell', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('is a function', function() {
    var fs = util.fs();
    expect(typeof fs.Shell).to.equal('function');
  });

  it('should return a FileSystemShell instance', function() {
    var fs = util.fs();
    var sh = new fs.Shell();

    expect(sh.prototype).to.deep.equal((new Filer.Shell(fs)).prototype);
  });

  it('should reflect changes to the prototype', function(){
    var fs = util.fs();
    var sh = new fs.Shell();

    Filer.Shell.prototype.test = 'foo';

    expect(sh.test).to.equal('foo');
  });
});
