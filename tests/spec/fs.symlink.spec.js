var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.symlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.symlink).to.be.a('function');
  });

  it('should return an error if part of the parent destination path does not exist', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if the destination path already exists', function(done) {
    var fs = util.fs();

    fs.symlink('/tmp', '/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EEXIST');
      done();
    });
  });

  it('should create a symlink', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myfile', function(error) {
      expect(error).not.to.exist;

      fs.stat('/myfile', function(err, stats) {
        expect(error).not.to.exist;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });
  });
  /** Tests for fsPromises API */
  describe('fsPromises.symlink', function () {
    it('should return an error if destination path does not exist', function () {
      var fsPromises = util.fs().promises;
      return fsPromises.symlink('/', '/tmp/link')
        .catch(error => {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');
        });
    
    it('should return an error if source path does not exist', function () {
      var fsPromises = util.fs().promises;
      return fsPromises.symlink('/tmp/myLink', '/myLink')
        .catch(error => {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');
        });
    });


    it('Promise should create a symlink of type DIRECTORY when directory provided', function () {
      var fsPromises = util.fs().promises;
      return fsPromises.symlink('/', '/myDirLink')
        .then(() => {
          return fsPromises.stat('/myDirLink')
            .then(stats => {
              expect(stats).to.exist;
              expect(stats.type).to.equal('DIRECTORY');
            })
            .catch(error => {
              expect(error).not.to.exist;
              expect(error.code).to.equal('ENOENT');
            });
        });
    });
      
    it('Promise should create a symlink of type FILE when file provided', function () {
      var fsPromises = util.fs().promises;
      fsPromises.open('/myFile', 'w+').catch((error) => {
        expect(error).not.to.exist;
      });
      return fsPromises.symlink('/myFile', '/myFileLink')
        .then(() => {
          return fsPromises.stat('/myFileLink')
            .then(stats => {
              expect(stats).to.exist;
              expect(stats.type).to.equal('FILE');
            })
            .catch(error => {
              expect(error).not.to.exist;
              expect(error.code).to.equal('ENOENT');
            });
        });
    });
      
    it('Promise should return an error if the destination path already exists', function () {
      var fsPromises = util.fs().promises;

      return fsPromises.symlink('/tmp', '/')
        .catch(error => {
          expect(error).to.exist;
          expect(error.code).to.equal('EEXIST');
        });
    });
  });

});


describe('fsPromises.symlink', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);


  it('should return an error if part of the parent destination path does not exist', () => {
    var fsPromises = util.fs().promises;

    return fsPromises.symlink('/', '/tmp/mydir')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });
});
