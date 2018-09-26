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

describe('fsPromise.chmod', function() {
  beforeEach(util.setup);
  afterEach(util.setup);

  it('should be a function', function() {
    var fsPromise = util.fs().promises;
    expect(typeof fsPromise.chmod).to.equal('function');
  });

  it('should return a promise', function() {
    var fsPromise = util.fs().promises;
    expect(fsPromise.chmod()).to.be.a('Promise');
  });

  it('should allow for updating mode of a given file', function() {
    var fsPromise = util.fs().promises;

    return fsPromise.open('/file', 'w')
      .then( () => {
        return fsPromise.chmod('/file', 0o444);
      })
      .catch( err => { throw err; })
      .then( () => {
        return fsPromise.stat('/file');
      })
      .catch( err => { throw err; })
      .then( stats => {
        expect(stats.mode & 0o444).to.equal(0o444);
      })
      .catch( err => { throw err; });
  });
});

describe('fsPromise.fchmod', function() {
  beforeEach(util.setup);
  afterEach(util.setup);

  it('should be a function', function() {
    var fsPromise = util.fs().promises;
    expect(typeof fsPromise.fchmod).to.equal('function');
  });

  it('should be a promise', function() {
    var fsPromise = util.fs().promises;
    expect(fsPromise.fchmod()).to.be.a('Promise');
  });

  it('should allow for updating mode of a given file', function() {
    var fsPromise = util.fs().promises;
    var fdesc;

    return fsPromise.open('/file', 'w')
      .then( fd => {
        fdesc = fd;
        return fsPromise.fchmod(fd, 0o777);
      })
      .catch( err => { throw err; })
      .then( () => {
        return fsPromise.fstat(fdesc);
      })
      .catch( err => { throw err; })
      .then( stats => {
        expect(stats.mode & 0o777).to.equal(0o777);
      })
      .catch( err => { throw err; });
  });
});