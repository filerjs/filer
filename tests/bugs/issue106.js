var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.writeFile truncation - issue 106', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should truncate an existing file', function(done) {
    var fs = util.fs();
    var filename = '/test';

    fs.writeFile(filename, '1', function(err) {
      if(err) throw err;

      fs.stat(filename, function(err, stats) {
        if(err) throw err;
        expect(stats.size).to.equal(1);

        fs.writeFile(filename, '', function(err) {
          if(err) throw err;

          fs.stat(filename, function(err, stats) {
            if(err) throw err;
            expect(stats.size).to.equal(0);
            done();
          });
        });
      });
    });
  });
});
