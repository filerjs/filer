var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.chmod, fs.fchmod', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be functions', function() {
    var fs = util.fs();
    expect(typeof fs.chmod).to.equal('function');
    expect(typeof fs.fchmod).to.equal('function');
  });

  it('should automatically set mode=755 for a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.stat('/dir', function(err, stats) {
        if(err) throw err;
        expect(stats.mode & 0o755).to.equal(0o755);
        done();
      });
    });
  });

  it('should automatically set mode=644 for a file', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fstat(fd, function(err, stats) {
        if(err) throw err;
        expect(stats.mode & 0o644).to.equal(0o644);
        fs.close(fd, done);
      });
    });
  });

  it('should allow for updating mode of a given file', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fchmod(fd, 0o777, function(err) {
        if(err) throw err;

        fs.fstat(fd, function(err, stats) {
          if(err) throw err;
          expect(stats.mode & 0o777).to.equal(0o777);

          fs.close(fd, function(err) {
            if(err) throw err;
                       
            fs.chmod('/file', 0o444, function(err) {
              if(err) throw err;
      
              fs.stat('/file', function(err, stats) {
                if(err) throw err;

                expect(stats.mode & 0o444).to.equal(0o444);
                done();
              });
            });
          });
        });
      });
    });
  });
});
