'use strict';

const util = require('../lib/test-utils.js'); //changed var to const
const expect = require('chai').expect; //changed var to const
const { COPYFILE_EXCL } = require('../../src/constants').fsConstants;



// Waiting on implementation to land https://github.com/filerjs/filer/issues/436
describe.skip('fs.copyFile', function() {
  const file = { //changed var to const
    path: '/srcfile',
    contents: 'This is a src file.'
  };

  beforeEach(function(done){
    util.setup(function() {
      let fs = util.fs(); //changed var to let
      fs.writeFile(file.path, file.contents, done);
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    let fs = util.fs(); //changed var to let
    expect(fs.copyFile).to.be.a('function');
  });

  it('should return an error if the src path does not exist', function(done){
    let fs = util.fs(); //changed var to let

    fs.copyFile(null, '/dest.txt', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should copy file successfully', function(done) {
    let fs = util.fs(); //changed var to let
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
    let fs = util.fs();  //changed var to let
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
