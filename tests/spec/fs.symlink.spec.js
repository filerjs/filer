'use strict'; 

const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.symlink', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    const fs = util.fs();
    expect(fs.symlink).to.be.a('function');
  });

  it('should return an error if part of the parent destination path does not exist', function (done) {
    const fs = util.fs();

    fs.symlink('/', '/tmp/mydir', function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if the destination path already exists', function (done) {
    const fs = util.fs();

    fs.symlink('/tmp', '/', function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EEXIST');
      done();
    });
  });

  it('should create a symlink', function (done) {
    const fs = util.fs();

    fs.symlink('/', '/myfile', function (error) {
      expect(error).not.to.exist;

      fs.stat('/myfile', function (err, stats) {
        expect(error).not.to.exist;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });
  });

  /** Tests for fsPromises API */
  describe('fsPromises.symlink', function () {
    it('should return an error if destination path does not exist', function () {
      const fsPromises = util.fs().promises;
  
      return fsPromises.symlink('/', '/tmp/link')
        .catch(error => {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');
        });
    });

    it('should return an error if source path does not exist', function () {
      const fsPromises = util.fs().promises;
  
      return fsPromises.symlink('/tmp/myLink', '/myLink')
        .catch(error => {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOENT');
        });
    });

    it('Promise should create a symlink of type DIRECTORY when directory provided', function () {
      const fsPromises = util.fs().promises;
  
      return fsPromises.symlink('/', '/myDirLink')
        .then(() => fsPromises.stat('/myDirLink'))
        .then(stats => {
          expect(stats).to.exist;
          expect(stats.type).to.equal('DIRECTORY');
        });
    });

    it('Promise should create a symlink of type FILE when file provided', function () {
      const fsPromises = util.fs().promises;

      return fsPromises.writeFile('/myFile', 'data')
        .then(() => fsPromises.symlink('/myFile', '/myFileLink'))
        .then(() => fsPromises.stat('/myFileLink'))
        .then(stats => {
          expect(stats).to.exist;
          expect(stats.type).to.equal('FILE');
        });
    });

    it('Promise should return an error if the destination path already exists', function () {
      const fsPromises = util.fs().promises;

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
    const fsPromises = util.fs().promises;

    return fsPromises.symlink('/', '/tmp/mydir')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });
});
