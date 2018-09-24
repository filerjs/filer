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
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });

  // it('should be return an error if the file destination path is bot exists', function(done){
  //   var fsPromises = unil.fs().promises;

  //   fsPromises.symlink('/tmp', '/', function(error){
  //     expect(error).to.exist;
  //     expect(error.code).to.equal('EEXIST');
  //     done();
  //   });
  // });
});

describe('fs.promises.symlink', function(){
  beforeEach(function(done){
    util.setup(function(){
      var fs = util.fs();
      fs.promises.symlink('/','myfile')
        .then(done())
        .catch(function(error){
          throw error;
        });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.promises.symlink).to.be.a('function');
  });

  // it('should be return an error if the file destination path is bot exists', function(done){
  //   // var fs= unil.fs();

  //   fs.promises.symlink('/tmp', '/', function(error){
  //     expect(error).to.exist;
  //     expect(error.code).to.equal('EEXIST');
  //     done();
  //   });
  // });
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
        expect(stats.type).to.equal('DIRECTORY');
        done();
      });
    });
  });
});