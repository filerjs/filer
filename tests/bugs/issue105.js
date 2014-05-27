var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('trailing slashes in path names, issue 105', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should deal with trailing slashes properly, path == path/', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(err) {
      if(err) throw err;

      fs.mkdir('/tmp/foo', function(err) {
        if(err) throw err;

        // Without trailing slash
        fs.readdir('/tmp', function(err, result1) {
          if(err) throw err;
          expect(result1).to.exist;
          expect(result1.length).to.equal(1);

          // With trailing slash
          fs.readdir('/tmp/', function(err, result2) {
            if(err) throw err;
            expect(result2).to.exist;
            expect(result2[0]).to.equal('foo');
            expect(result1).to.deep.equal(result2);
            done();
          });
        });
      });
    });
  });
});
