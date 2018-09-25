var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.rmdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.rmdir).to.be.a('function');
  });

  it('should return an error if the path does not exist', function(done) {
    var fs = util.fs();

    fs.rmdir('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if attempting to remove the root directory', function(done) {
    var fs = util.fs();

    fs.rmdir('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBUSY');
      done();
    });
  });

  it('should return an error if the directory is not empty', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.mkdir('/tmp/mydir', function(error) {
        if(error) throw error;
        fs.rmdir('/', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('EBUSY');
          done();
        });
      });
    });
  });

  it('should return an error if the path is not a directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.open('/tmp/myfile', 'w', function(error, fd) {
        if(error) throw error;
        fs.close(fd, function(error) {
          if(error) throw error;
          fs.rmdir('/tmp/myfile', function(error) {
            expect(error).to.exist;
            expect(error.code).to.equal('ENOTDIR');
            done();
          });
        });
      });
    });
  });

  it('should return an error if the path is a symbolic link', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function (error) {
      if(error) throw error;
      fs.symlink('/tmp', '/tmp/myfile', function (error) {
        if(error) throw error;
        fs.rmdir('/tmp/myfile', function (error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOTDIR');
          done();
        });
      });
    });
  });

  it('should remove an existing directory', function(done) {
    var fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.rmdir('/tmp', function(error) {
        expect(error).not.to.exist;
        if(error) throw error;
        fs.stat('/tmp', function(error, stats) {
          expect(error).to.exist;
          expect(stats).not.to.exist;
          done();
        });
      });
    });
  });

  it('(promise) should be a function', function() {
    var fsPromises = util.fs().promises;
    expect(fsPromises.rmdir).to.be.a('function');
  });
  
  it('(promise) should return an error if the path does not exist', function() {
    var fsPromises = util.fs().promises;
    return fsPromises.rmdir('/tmp/mydir')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });

  it('(promise) should return an error if attempting to remove the root directory', function() {
    var fsPromises = util.fs().promises;
    return fsPromises.rmdir('/')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('EBUSY');
      });
  });
});

describe('fs.promises.rmdir', function(){
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should return an error if the directory is not empty', function() {
    var fs = util.fs();
    var fsPromises = fs.promises;

    return fsPromises.mkdir('/tmp')
      .then(() => fsPromises.mkdir('/tmp/mydir'))
      .then(() => fsPromises.rmdir('/'))
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('EBUSY');
      });
  });
 
  it('should return an error if the path is not a directory', function() {
    var fs = util.fs();
    var fsPromises = fs.promises;

    return fsPromises.mkdir('/tmp')
      .then(() => fsPromises.writeFile('/tmp/myfile','Hello World'))
      .then(() => fsPromises.rmdir('/tmp/myfile'))
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOTDIR');
      });
  });
});
describe('fsPromises.rmdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);
  
  it('should return an error if the path does not exist', function() {
    var fs = util.fs().promises;
    
    return fs.rmdir('/tmp/mydir')
    .catch(error => {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
    });
  });
  it('should return an error if attempting to remove the root directory', function(){
    var fs = util.fs().promises;
    
    return fs.rmdir('/')
    .catch(error => {
      expect(error).to.exist;
      expect(error.code).to.equal('EBUSY');
    });
  });
});