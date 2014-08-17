var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('EISDIR when trying to open a dir path - issue 254', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should fail with EISDIR for root dir', function(done) {
    var fs = util.fs();

    fs.readFile('/', function(err) {
      expect(err.code).to.equal('EISDIR');
      done();
    });
  });

  it('should fail with EISDIR for regular dir', function(done) {
    var fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.readFile('/dir', function(err) {
        expect(err.code).to.equal('EISDIR');
        done();
      });
    });
  });

  it('should fail with EISDIR for symlinked dir', function(done) {
    var fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.symlink('/dir', '/link', function(err) {
        if(err) throw err;

        fs.readFile('/link', function(err) {
          expect(err.code).to.equal('EISDIR');
          done();
        });
      });
    });
  });
});
