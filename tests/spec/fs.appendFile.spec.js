var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.appendFile', function() {
  beforeEach(function(done) {
    util.setup(function() {
      var fs = util.fs();
      fs.writeFile('/myfile', "This is a file.", { encoding: 'utf8' }, function(error) {
        if(error) throw error;
        done();
      });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.appendFile).to.be.a('function');
  });

  it('should append a utf8 file without specifying utf8 in appendFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.appendFile('/myfile', more, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a utf8 file with "utf8" option to appendFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.appendFile('/myfile', more, 'utf8', function(error) {
      if(error) throw error;

      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a utf8 file with {encoding: "utf8"} option to appendFile', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.appendFile('/myfile', more, { encoding: 'utf8' }, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', { encoding: 'utf8' }, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a binary file', function(done) {
    var fs = util.fs();

    // String and utf8 binary encoded versions of the same thing:
    var contents = "This is a file.";
    var binary = new Uint8Array([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);
    var more = " Appended.";
    var binary2 = new Uint8Array([32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);
    var binary3 = new Uint8Array([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46,
                                  32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);

    fs.writeFile('/mybinaryfile', binary, function(error) {
      if(error) throw error;

      fs.appendFile('/mybinaryfile', binary2, function(error) {
        if(error) throw error;

        fs.readFile('/mybinaryfile', 'ascii', function(error, data) {
          expect(error).not.to.exist;
          expect(data).to.deep.equal(binary3);
          done();
        });
      });
    });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";
    var more = " Appended.";

    fs.symlink('/myfile', '/myFileLink', function (error) {
      if (error) throw error;

      fs.appendFile('/myFileLink', more, 'utf8', function (error) {
        if (error) throw error;

        fs.readFile('/myFileLink', 'utf8', function(error, data) {
          expect(error).not.to.exist;
          expect(data).to.equal(contents + more);
          done();
        });
      });
    });
  });

  it('should work when file does not exist, and create the file', function(done) {
    var fs = util.fs();
    var contents = "This is a file.";

    fs.appendFile('/newfile', contents, { encoding: 'utf8' }, function(error) {
      expect(error).not.to.exist;

      fs.readFile('/newfile', 'utf8', function(err, data) {
        if(err) throw err;
        expect(data).to.equal(contents);
        done();
      });
    });
  });
});
