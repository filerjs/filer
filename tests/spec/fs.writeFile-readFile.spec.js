'use strict';
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.writeFile, fs.readFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(fs.writeFile).to.be.a('function');
    expect(fs.readFile).to.be.a('function');
  });

  it('should error when path is wrong to readFile', function(done) {
    const fs = util.fs();

    fs.readFile('/no-such-file', 'utf8', function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(data).not.to.exist;
      done();
    });
  });

  
  it('should error when path is wrong to writeFile',function(done){
    const fs = util.fs();

    fs.writeFile('/tmp/myfile', '','utf8', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(result).not.to.exist;
      done();
    });

  });

  it('should write, read a utf8 file without specifying utf8 in writeFile', function(done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write a string when given a number for the data', function(done) {
    var fs = util.fs();
    var contents = 7;
    var contentsAsString = '7';

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contentsAsString);
        done();
      });
    });
  });

  it('should write, read a utf8 file with "utf8" option to writeFile', function(done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', contents, 'utf8', function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write, read a utf8 file with {encoding: "utf8"} option to writeFile', function(done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', contents, { encoding: 'utf8' }, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write, read a binary file', function(done) {
    const fs = util.fs();
    // String and utf8 binary encoded versions of the same thing: 'This is a file.'
    const binary = Buffer.from([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

    fs.writeFile('/myfile', binary, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.deep.equal(binary);
        done();
      });
    });
  });

  it('should follow symbolic links', function(done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', '', { encoding: 'utf8' }, function(error) {
      if(error) throw error;
      fs.symlink('/myfile', '/myFileLink', function (error) {
        if (error) throw error;
        fs.writeFile('/myFileLink', contents, 'utf8', function (error) {
          if (error) throw error;
          fs.readFile('/myFileLink', 'utf8', function(error, data) {
            expect(error).not.to.exist;
            expect(data).to.equal(contents);
            done();
          });
        });
      });
    });
  });
});

/**
 * fsPromises tests
 */

describe('fsPromises.writeFile, fsPromises.readFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fsPromises = util.fs().promises;
    expect(fsPromises.writeFile).to.be.a('function');
    expect(fsPromises.readFile).to.be.a('function');
  });

  it('should return a promise', function() {
    const fsPromises = util.fs().promises;
    const contents = 'This is a file.';

    const p = fsPromises.writeFile('/myfile', contents);
    expect(p).to.be.a('Promise');

    p.then(() => {
      expect(fsPromises.readFile('/myfile', 'utf8')).to.be.a('Promise');
    });
    return p;
  });

  it('should error when path is wrong to readFile', function() {
    const fsPromises = util.fs().promises;

    return fsPromises.readFile('/no-such-file', 'utf8')
      .catch(error => { 
        expect(error).to.exist; 
        expect(error.code).to.equal('ENOENT'); 
      });
  });

  it('should write, read a utf8 file without specifying utf8 in writeFile', function() {
    const fsPromises = util.fs().promises;
    const contents = 'This is a file.';

    return fsPromises.writeFile('/myfile', contents)
      .then( () => fsPromises.readFile('/myfile', 'utf8'))
      .then(data => { expect(data).to.equal(contents); });
  });

  it('should write, read a utf8 file with "utf8" option to writeFile', function() {
    const fsPromises = util.fs().promises;
    const contents = 'This is a file.';

    return fsPromises.writeFile('/myfile', contents, 'utf8') 
      .then( () => fsPromises.readFile('/myfile', 'utf8'))
      .then(data => { expect(data).to.equal(contents); });
  });

  it('should write, read a utf8 file with {encoding: "utf8"} option to writeFile', function() {
    const fsPromises = util.fs().promises;
    const contents = 'This is a file.';

    return fsPromises.writeFile('/myfile', contents, { encoding: 'utf8' })
      .then( () => fsPromises.readFile('/myfile', 'utf8'))
      .then(data => { expect(data).to.equal(contents); });
  });

  it('should write, read a binary file', function() {
    const fsPromises = util.fs().promises;
    // String and utf8 binary encoded versions of the same thing: 'This is a file.'
    const binary = Buffer.from([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

    return fsPromises.writeFile('/myfile', binary)
      .then( () => fsPromises.readFile('/myfile'))
      .then(data => { expect(data).to.deep.equal(binary); });
  });

  it('should follow symbolic links', function() {
    const fsPromises = util.fs().promises;
    const contents = 'This is a file.';

    return fsPromises.writeFile('/myfile', '', { encoding: 'utf8' })
      .then( () => fsPromises.symlink('/myfile', '/myFileLink'))
      .then( () => fsPromises.writeFile('/myFileLink', contents, 'utf8'))
      .then( () => fsPromises.readFile('/myFileLink', 'utf8'))
      .then(data => { expect(data).to.equal(contents); });
  });
});


