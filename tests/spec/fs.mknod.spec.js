var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.mknod', function(){
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function(done){
    var fs = util.fs();
    expect(fs.mknod).to.be.a('function');
    done();
  });

  it('should return an error if part of the parent path does not exist', function(done){
    var fs = util.fs();

    fs.mknod('/dir/mydir', 'DIRECTORY', function(error){
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if path already exists', function(done){
    var fs = util.fs();

    fs.mknod('/', 'DIRECTORY', function(error){
      expect(error.code).to.equal('EEXIST');
      done();
    });
  });

  it('should return an error if the parent node is not a directory', function(done){
    var fs = util.fs();

    fs.mknod('/file', 'FILE', function(error){
      if (error) throw error;

      fs.mknod('/file/myfile', 'FILE', function(error){
        expect(error.code).to.equal('ENOTDIR');
        done();
      });
    });
  });

  it('should return an error if the mode provided is not DIRECTORY or FILE', function(done){
    var fs = util.fs();

    fs.mknod('/symlink', 'SYMLINK', function(error){
      expect(error).to.exist;
      expect(error.code).to.equal('EINVAL');
      done();
    });
  });

  it('should make a new directory', function(done){
    var fs = util.fs();

    fs.mknod('/dir', 'DIRECTORY', function(error){
      if (error) throw error;

      fs.stat('/dir', function(error, stats){
        expect(error).not.to.exist;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });
  });

  it('should make a new file', function(done){
    var fs = util.fs();

    fs.mknod('/file', 'FILE', function(error){
      if (error) throw error;

      fs.stat('/file', function(error, result){
        expect(error).not.to.exist;
        expect(result.isFile()).to.be.true;
        done();
      });
    });
  });
  describe('Promise test mknod', function(){

    it('should return an error if part of the parent path does not exist', function(){
      var fs = util.fs().promises;

      return fs.mknod('/dir/mydir', 'DIRECTORY')
        .catch(error => {
          expect(error.code).to.equal('ENOENT');
        });
    });
  });
});
