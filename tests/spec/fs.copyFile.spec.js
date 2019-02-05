'use strict';
const util = require('../lib/test-utils.js'); 
const expect = require('chai').expect; 
const { COPYFILE_EXCL } = require('../../src/constants').fsConstants;



// Waiting on implementation to land https://github.com/filerjs/filer/issues/436
describe.skip('fs.copyFile', function() {
  const file = { 
    path: '/srcfile',
    contents: 'This is a src file.'
  };

  beforeEach(function(done){
    util.setup(function() {
      const fs = util.fs(); 
      fs.writeFile(file.path, file.contents, done);
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs(); 
    expect(fs.copyFile).to.be.a('function');
  });

  it('should return an error if the src path does not exist', function(done){
    const fs = util.fs(); 

    fs.copyFile(null, '/dest.txt', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should copy file successfully', function(done) {
    const fs = util.fs(); 
    const destPath = '/destfile';

    fs.copyFile(file.path, destPath, function(error) {
      if(error) throw error;

      fs.readFile(destPath, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(file.contents);
        done();
      });
    });
  });

  it('should return an error if flag=COPYFILE_EXCL and the destination file exists', function (done) {
    const fs = util.fs();  
    const destPath = '/destfile';

    fs.writeFile(destPath, 'data', function(error) {
      if(error) throw error;

      fs.copyFile(file.path, destPath, COPYFILE_EXCL, function(error) {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
        done();
      });  
    });
  });
});
