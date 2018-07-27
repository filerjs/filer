var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.chown, fs.fchown', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be functions', function() {
    var fs = util.fs();
    expect(typeof fs.chown).to.equal('function');
    expect(typeof fs.fchown).to.equal('function');
  });

  it('should automatically set a file\'s uid and gid to 0 (i.e., root)', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fstat(fd, function(err, stats) {
        if(err) throw err;

        expect(stats.uid).to.equal(0);
        expect(stats.gid).to.equal(0);
        fs.close(fd, done);
      });
    });
  });

  it('should allow updating gid and uid for a file', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fchown(fd, 1001, 1001, function(err) {
        if(err) throw err;

        fs.fstat(fd, function(err, stats) {
          if(err) throw err;

          expect(stats.uid).to.equal(1001);
          expect(stats.gid).to.equal(1001);

          fs.close(fd, function(err) {
            if(err) throw err;
                        
            fs.chown('/file', 500, 500, function(err) {
              if(err) throw err;
    
              fs.stat('/file', function(err, stats) {
                if(err) throw err;

                expect(stats.uid).to.equal(500);
                expect(stats.gid).to.equal(500);
                done();
              });
            });
          });
        });
      });
    });
  });
});
