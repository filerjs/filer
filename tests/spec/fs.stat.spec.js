var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.stat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.stat).to.equal('function');
  });

  it('should return an error if path does not exist', function(done) {
    var fs = util.fs();

    fs.stat('/tmp', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return a stat object if path exists', function(done) {
    var fs = util.fs();

    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;

      expect(result['node']).to.be.a('string');
      expect(result['dev']).to.equal(fs.name);
      expect(result['size']).to.be.a('number');
      expect(result['nlinks']).to.be.a('number');
      expect(result['atime']).to.be.a('number');
      expect(result['mtime']).to.be.a('number');
      expect(result['ctime']).to.be.a('number');
      expect(result['type']).to.equal('DIRECTORY');

      done();
    });
  });

  it('should follow symbolic links and return a stat object for the resulting path', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;

            fs.stat('/myfilelink', function(error, result) {
              expect(error).not.to.exist;
              expect(result).to.exist;
              expect(result['node']).to.exist;
              done();
            });
          });
        });
      });
    });
  });

  it('should return a stat object for a valid descriptor', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.fstat(fd, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;

        expect(result['node']).to.exist;
        expect(result['dev']).to.equal(fs.name);
        expect(result['size']).to.be.a('number');
        expect(result['nlinks']).to.be.a('number');
        expect(result['atime']).to.be.a('number');
        expect(result['mtime']).to.be.a('number');
        expect(result['ctime']).to.be.a('number');
        expect(result['type']).to.equal('FILE');

        done();
      });
    });
  });

  it('(promise) should be a function', function() {
    var fs = util.fs();
    expect(fs.promises.stat).to.be.a('function');
  });
  
  it('should return a promise', function() {
    var fs = util.fs();
    expect(fs.promises.stat()).to.be.a('Promise');
  });
  
  it('(promise) should return a stat object if file exists', function() {
    var fs = util.fs();

    return fs.promises
      .stat('/')
      .then(result => { 
        expect(result).to.exist;
        expect(result.node).to.be.a('string');
        expect(result.dev).to.equal(fs.name);
        expect(result.size).to.be.a('number');
        expect(result.nlinks).to.be.a('number');
        expect(result.atime).to.be.a('number');
        expect(result.mtime).to.be.a('number');
        expect(result.ctime).to.be.a('number');
        expect(result.type).to.equal('DIRECTORY');
      }); 
  });
});
