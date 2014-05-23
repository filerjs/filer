var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.writeFile, fs.readFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.writeFile).to.be.a('function');
    expect(fs.readFile).to.be.a('function');
  });

  it('should error when path is wrong to readFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.readFile('/no-such-file', 'utf8', function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal("ENOENT");
      expect(data).not.to.exist;
      done();
    });
  });

  it('should write, read a utf8 file without specifying utf8 in writeFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.writeFile('/myfile', contents, function(error) {
      if(error) throw error;
      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents);
        done();
      });
    });
  });

  it('should write, read a utf8 file with "utf8" option to writeFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

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
    var fs = util.fs();
    var contents = "This is a file.";

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
    var fs = util.fs();
    // String and utf8 binary encoded versions of the same thing:
    var contents = "This is a file.";
    var binary = new Uint8Array([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

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
    var fs = util.fs();
    var contents = "This is a file.";

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
