var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.readlink).to.be.a('function');
  });

  it('should return an error if part of the parent destination path does not exist', function(done) {
    var fs = util.fs();

    fs.readlink('/tmp/mydir', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if the path is not a symbolic link', function(done) {
    var fs = util.fs();

    fs.readlink('/', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return the contents of a symbolic link', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myfile', function(error) {
      if(error) throw error;

      fs.readlink('/myfile', function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.equal('/');
        done();
      });
    });
  });

  it('should allow relative paths, but resolve to the dstpath', function(done) {
    var fs = util.fs();
    var contents = 'contents';

    fs.mkdir('/dir', function(error) {
      if(error) throw error;

      fs.writeFile('/file', contents, function(error) {
        if(error) throw error;

        fs.symlink('../file', '/dir/symlink', function(error) {
          if(error) throw error;

          fs.readlink('/dir/symlink', function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.equal('../file');

            fs.readFile('/dir/symlink', 'utf8', function(error, data) {
              expect(error).not.to.exist;
              expect(data).to.equal(contents);
              done();
            });
          });
        });
      });
    });
  });
});
