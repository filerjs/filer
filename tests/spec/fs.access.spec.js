var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.access', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs();
    expect(typeof fs.access).to.equal('function');
  });

  it('should return an error if file does not exist', function (done) {
    var fs = util.fs();

    fs.access('/tmp', fs.constants.F_OK, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return no error if file does exist and mode = F_OK', function (done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.F_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return no error if file does exist and mode = R_OK', function (done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.R_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return no error if file does exist and mode = W_OK', function (done) {
    var fs = util.fs();
    var contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.W_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  // See bug https://github.com/filerjs/filer/issues/602
  it.skip('should return an error if file is not executable and mode = X_OK', function (done) {
    var fs = util.fs();
    var contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.chmod('/myfile', 0o644, function(error){
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
    var fs = util.fs();
    var contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.chmod('/myfile', 0o777, function(error){
        if (error) throw error;
      
        fs.access('/myfile', fs.constants.X_OK, function (error) {
          expect(error).not.to.exist;
          done();
        });
      });
    });
  });

  it('should return no error if file does exist and no mode is passed', function (done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });

  it('should return no error if file does exist and mode = R_OK | W_OK', function (done) {
    var fs = util.fs();
    var contents = 'This is a file.';
   
    fs.writeFile('/myfile', contents, function (error) {
      if (error) throw error;

      fs.access('/myfile', fs.constants.R_OK | fs.constants.W_OK, function (error) {
        expect(error).not.to.exist;
        done();
      });
    });
  });
});
