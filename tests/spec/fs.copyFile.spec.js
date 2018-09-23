var Filer = require('../../src');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.copyFile', function(){
  beforeEach(function(done){
    util.setup(function() {
      var fs = util.fs();
      fs.writeFile('/srcfile', 'This is a src file.', function(error){
        if(error) throw error;
        fs.writeFile('/destfile', 'This is a dest file.', function(error){
          if(error) throw error;
          done();
        });
      });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.copyFile).to.be.a('function');
  });

  it('should return an error if the src path does not exist', function(done){
    var fs = util.fs();
    var src = null;
    var dest = 'dest.txt';

    fs.copyFile(src, dest, function(error){
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
   
  });

  it('should copy file successfully', function(done) {
    var fs = util.fs();
    var src = "This is a src file.";

    fs.copyFile('/srcfile', '/destfile', function(error) {
      if(error) throw error;

      fs.readFile('/destfile', function(error, data){
        expect(error).not.to.exist;
        expect(data).to.equal(src);
        done();
      });
    });
  });

});