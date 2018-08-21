var Filer = require('../../src');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.Shell', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('is a function', function(done) {
    var fs = util.fs();
    expect(typeof fs.Shell).to.equal('function');

    done();
  });

  it('should return a FileSystemShell instance', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    expect(sh.prototype).to.deep.equal((new Filer.Shell(fs)).prototype);
    done();
  });

  it('should reflect changes to the prototype', function(done){
    var fs = util.fs();
    var sh = new fs.Shell();

    Filer.Shell.prototype.test = 'foo';

    expect(sh.test).to.equal('foo');
    done();
  });
});
