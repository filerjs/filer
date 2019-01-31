'use strict';

const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.access', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should expose access mode flags on fs and fs.constants', function() {
    const fs = util.fs();

    // F_OK
    expect(fs.F_OK).to.equal(0);
    expect(fs.constants.F_OK).to.equal(0);

    // R_OK
    expect(fs.R_OK).to.equal(4);
    expect(fs.constants.R_OK).to.equal(4);

    // W_OK
    expect(fs.W_OK).to.equal(2);
    expect(fs.constants.W_OK).to.equal(2);
    
    // X_OK
    expect(fs.X_OK).to.equal(1);
    expect(fs.constants.X_OK).to.equal(1);
  });

  it('should be a function', function () {
    const fs = util.fs();
    expect(typeof fs.access).to.equal('function');
  });

  it('should return an error if file does not exist', function (done) {
    const fs = util.fs();

    fs.access('/tmp', fs.constants.F_OK, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return no error if file does exist and mode = F_OK', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.F_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return no error if file does exist and mode = R_OK', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.R_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return no error if file does exist and mode = W_OK', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.W_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return an error if file is not executable and mode = X_OK', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.chmod('/myfile', '644', function(error){
        if (error) throw error;
      
        fs.access('/myfile', fs.constants.X_OK, function (error) {
          expect(error).to.exist;
          expect(error.code).to.equal('EACCES');
          done();
        });  
      });
    });
  });

  it('should return no error if file does exist and mode = X_OK', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.chmod('/myfile', 0o777, function(error) {
        if (error) throw error;
      
        fs.access('/myfile', fs.constants.X_OK, function (error) {
          expect(error).not.to.exist;
          done();
        });
      });
    });
  });

  it('should return no error if file does exist and no mode is passed', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return no error if file does exist and mode = R_OK | W_OK', function (done) {
    const fs = util.fs();
    const contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.R_OK | fs.constants.W_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });
});
