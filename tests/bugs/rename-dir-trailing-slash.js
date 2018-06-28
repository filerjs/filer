var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('trailing slashes in path names to work when renaming a dir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should deal with trailing slashes in rename, dir == dir/', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(err) {
      if(err) throw err;

      fs.rename('/tmp/', '/new-tmp/', function(err) {
        if(err) throw err;

        fs.stat('/new-tmp', function(err, stats) {
          if(err) throw err;
          expect(stats).to.exist;
          expect(stats.isDirectory()).to.be.true;

          done();
        });
      });
    });
  });
});
