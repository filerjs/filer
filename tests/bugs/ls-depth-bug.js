var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('sh.ls and deep directory trees', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should not crash when calling sh.ls() on deep directory layouts', function(done) {
    var fs = util.fs();
    var sh = fs.Shell();

    // The specific depth at which this will fail is based on the depth
    // of the call stack, since sh.ls() is recursive, so it can be less
    // than this in some cases, but this should trigger it in *this* case.
    var path = '/1/2/3/4/5/6/7/8/9/10/11/12/13/14/15/16/17/18/19/20';

    sh.mkdirp(path, function(err) {
      if(err) throw err;

      sh.ls('/', {recursive: true}, function(err, listing) {
        expect(err).not.to.exist;
        expect(listing).to.exist;
        done();
      });
    });
  });
});
