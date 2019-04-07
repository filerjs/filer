var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.chown, fs.fchown, fs.lchown', function() {
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

  it('lchown should expect an interger value for uid', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.lchown(fd, '1001', 1001, function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        fs.close(fd, done);
      });
    });
  }); 

  it('fchown should expect an interger value for uid', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fchown(fd, '1001', 1001, function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        fs.close(fd, done);
      });
    });
  });

  it('chown should expect an interger value for uid', function(done) {
    var fs = util.fs();

    fs.writeFile('/file', 'w', function(err) {
      if(err) throw err;

      fs.chown('/file', '1001', 1001, function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('lchown should expect an interger value for gid', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.lchown(fd, 1001, '1001', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        fs.close(fd, done);
      });
    });
  }); 

  it('fchown should expect an interger value for gid', function(done) {
    var fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fchown(fd, 1001, '1001', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        fs.close(fd, done);
      });
    });
  });

  it('chown should expect an interger value for gid', function(done) {
    var fs = util.fs();

    fs.writeFile('/file', 'w', function(err) {
      if(err) throw err;

      fs.chown('/file', 1001, '1001', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        done();
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
                //done();
              });
            });

            fs.lchown('/file', 500, 500, function(err) {
              if(err) throw err;
        
              fs.lstat('/file', function(err, stats) {
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


describe('fs.promises.chown', function(){
  beforeEach(util.setup);
  afterEach(util.setup);

  it('should be a function', function(){
    var fsPromises = util.fs().promises;
    expect(fsPromises.chown).to.be.a('function');
  });

  it('should allow updating uid and gid for a file', function() {
    var fsPromises = util.fs().promises;

    return fsPromises
      .writeFile('/file', 'data')
      .then(() => fsPromises.chown('/file', 500, 500))
      .then(() => fsPromises.stat('/file'))
      .then((stats) => {
        expect(stats.uid).to.equal(500);
        expect(stats.gid).to.equal(500);
      });
  });
});
