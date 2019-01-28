'use strict';

const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.chmod, fs.fchmod', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be functions', function() {
    const fs = util.fs();
    expect(typeof fs.chmod).to.equal('function');
    expect(typeof fs.fchmod).to.equal('function');
  });

  it('should automatically set mode=755 for a directory', function(done) {
    const fs = util.fs();

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
    const fs = util.fs();

    fs.open('/file', 'w', function(err, fd) {
      if(err) throw err;

      fs.fstat(fd, function(err, stats) {
        if(err) throw err;
        expect(stats.mode & 0o644).to.equal(0o644);
        fs.close(fd, done);
      });
    });
  });

  it('should be an error when the path is invalid', function(done){
    const fs = util.fs();
    fs.chmod('/invalid_path', 0o444, function(err){
      expect(err).to.exist;
      expect(err.code).to.equal('ENOENT');
      done();
    });
  });

  it('should error if mode value is a non-numeric string', function(done) {
    const fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;
      
      fs.chmod('/dir', 'mode', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error if mode value is null', function(done) {
    const fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;
      
      fs.chmod('/dir', 'null', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error if mode value is non-integer number', function(done) {
    const fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;
      
      fs.chmod('/dir', 3.14, function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error if mode value is non-integer number', function(done) {
    const fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;
      
      fs.chmod('/dir', 3.14, function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should allow octal strings for mode value', function(done) {
    const fs = util.fs();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;
      
      fs.chmod('/dir', '777', function(err) {
        if(err) throw err;

        fs.stat('/dir/', function(err, stats) {
          if(err) throw err;

          expect(stats.mode & 0o777).to.equal(0o777);
          done();
        });
      });
    });
  });

  it('should allow for updating mode of a given file', function(done) {
    const fs = util.fs();

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

describe('fsPromise.chmod', function() {
  beforeEach(util.setup);
  afterEach(util.setup);

  it('should be a function', function() {
    const fsPromise = util.fs().promises;
    expect(typeof fsPromise.chmod).to.equal('function');
  });

  it('should allow for updating mode of a given file', function() {
    const fsPromise = util.fs().promises;

    return fsPromise.open('/file', 'w')
      .then(() => fsPromise.chmod('/file', 0o444))
      .then(() => fsPromise.stat('/file'))
      .then(stats => expect(stats.mode & 0o444).to.equal(0o444));
  });
});
