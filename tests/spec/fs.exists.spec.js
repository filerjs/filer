const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.exists', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(typeof fs.exists).to.equal('function');
  });

  it('should return false if path does not exist', function(done) {
    const fs = util.fs();

    fs.exists('/tmp', function(result) {
      expect(result).to.be.false;
      done();
    });
  });

  it('should return true if path exists', function(done) {
    const fs = util.fs();

    fs.open('/myfile', 'w', function(err, fd) {
      if(err) throw err;

      fs.close(fd, function(err) {
        if(err) throw err;

        fs.exists('/myfile', function(result) {
          expect(result).to.be.true;
          done();
        });
      });
    });
  });

  it('should follow symbolic links and return true for the resulting path', function(done) {
    const fs = util.fs();

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.symlink('/myfile', '/myfilelink', function(error) {
          if(error) throw error;

          fs.exists('/myfilelink', function(result) {
            expect(result).to.be.true;
            done();
          });
        });
      });
    });
  });
  
  it('should follow symbolic links and return false if for the resulting path does not exist', function(done) {
    const fs = util.fs();

    fs.open('/myfile', 'w', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.symlink('/myfile', '/myfilelink', function(error) {
          if(error) throw error;
        
          fs.unlink('/myfile', function(err) {
            if(err) throw err;
          
            fs.exists('/myfilelink', function(result) {
              expect(result).to.be.false;
              done();
            });
          });
        });
      });
    });
  });
});
