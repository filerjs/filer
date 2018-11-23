var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.unlink', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.unlink).to.be.a('function');
  });

  it('should remove a link to an existing file', function(done) {
    var fs = util.fs();
    var complete1, complete2;

    function maybeDone() {
      if(complete1 && complete2) {
        done();
      }
    }

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.link('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          fs.unlink('/myfile', function(error) {
            if(error) throw error;

            fs.stat('/myfile', function(error, result) {
              expect(error).to.exist;
              expect(result).not.to.exist;
              complete1 = true;
              maybeDone();
            });

            fs.stat('/myotherfile', function(error, result) {
              if(error) throw error;

              expect(result.nlinks).to.equal(1);
              complete2 = true;
              maybeDone();
            });
          });
        });
      });
    });
  });

  it('should not follow symbolic links', function(done) {
    var fs = util.fs();

    fs.symlink('/', '/myFileLink', function (error) {
      if (error) throw error;

      fs.link('/myFileLink', '/myotherfile', function (error) {
        if (error) throw error;

        fs.unlink('/myFileLink', function (error) {
          if (error) throw error;

          fs.lstat('/myFileLink', function (error, result) {
            expect(error).to.exist;
            expect(result).not.to.exist;

            fs.lstat('/myotherfile', function (error, result) {
              if (error) throw error;
              expect(result.nlinks).to.equal(1);

              fs.stat('/', function (error, result) {
                if (error) throw error;
                expect(result.nlinks).to.equal(1);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should not unlink directories', function (done) {
    var fs = util.fs();

    fs.mkdir('/mydir', function (error) {
      if(error) throw error;

      fs.unlink('/mydir', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EPERM');

        fs.stat('/mydir', function (error, stats) {
          expect(error).not.to.exist;
          expect(stats).to.exist;
          expect(stats.type).to.equal('DIRECTORY');
          done();
        });
      });
    });
  });
});

describe('fs.promises.unlink', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs();
    expect(fs.promises.unlink).to.be.a('function');
  });

  it('should return an error if trying to delete a file that does not exist', function() {
    var fsPromises = util.fs().promises;

    return fsPromises.unlink('/myFile')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });
});
