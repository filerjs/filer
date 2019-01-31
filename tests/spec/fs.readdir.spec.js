'use strict'; 

const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.readdir', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(fs.readdir).to.be.a('function');
  });

  it('should return an error if the path does not exist', function(done) {
    const fs = util.fs();

    fs.readdir('/tmp/mydir', function(error, files) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(files).not.to.exist;
      done();
    });
  });

  it('should return a list of files from an existing directory', function(done) {
    const fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;

      fs.readdir('/', function(error, files) {
        expect(error).not.to.exist;
        expect(files).to.exist;
        expect(files.length).to.equal(1);
        expect(files[0]).to.equal('tmp');
        done();
      });
    });
  });

  it('should follow symbolic links', function(done) {
    const fs = util.fs();

    fs.mkdir('/tmp', function(error) {
      if(error) throw error;
      fs.symlink('/', '/tmp/dirLink', function(error) {
        if(error) throw error;
        fs.readdir('/tmp/dirLink', function(error, files) {
          expect(error).not.to.exist;
          expect(files).to.exist;
          expect(files.length).to.equal(1);
          expect(files[0]).to.equal('tmp');
          done();
        });
      });
    });
  });

  it('(promise) should be a function', function() {
    const fsPromises = util.fs().promises;
    expect(fsPromises.readdir).to.be.a('function');
  });

  it('should return an error if the path is a file', function() {
    const fsPromises = util.fs().promises;

    return fsPromises.writeFile('/myfile', 'contents')
      .then(() => fsPromises.readdir('/myfile'))
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOTDIR');
      });
  });

  it('(promise) should return a list of files from an existing directory', function() {
    const fsPromises = util.fs().promises;

    return fsPromises.mkdir('/tmp')
      .then(() => {
        return fsPromises.stat('/');
      })
      .then(stats => {
        expect(stats).to.exist;
        expect(stats.isDirectory()).to.be.true;
      })
      .then(() => {
        return fsPromises.readdir('/');
      })
      .then(files => {
        expect(files).to.exist;
        expect(files.length).to.equal(1);
        expect(files[0]).to.equal('tmp');
      });
  });
});
