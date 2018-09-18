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

    fs.readFile('/no-such-file', 'utf8', function(error, data) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(data).not.to.exist;
      done();
    });
  });

  it('should write, read a utf8 file without specifying utf8 in writeFile', function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';

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
    var contents = 'This is a file.';

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
    var contents = 'This is a file.';

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
    // String and utf8 binary encoded versions of the same thing: 'This is a file.'
    var binary = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

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
    var contents = 'This is a file.';

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





describe('fs.promises.writeFile, fs.promises.readFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.promises.writeFile).to.be.a('function');
    expect(fs.promises.readFile).to.be.a('function');
  });

  it('should return a promise', function() {
    var fs = util.fs();
    var contents = 'This is a file.';

    expect(fs.promises.writeFile('/myfile', contents)).to.be.a('Promise');
    expect(fs.promises.readFile('/myfile', 'utf8')).to.be.a('Promise');
  });

  it('should error when path is wrong to readFile', function(done) {
    var fs = util.fs();

    
    fs.promises.readFile('/no-such-file', 'utf8')
      .then(data => expect(data).not.to.exist)
      .catch(error => { expect(error).to.exist; expect(error.code).to.equal('ENOENT'); done(); });
    

  });

  it('should write, read a utf8 file without specifying utf8 in writeFile', function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.promises.writeFile('/myfile', contents)
      .then( () => {

        fs.promises.readFile('/myfile', 'utf8')
          .then( (data, error) => { expect(data).to.equal(contents); expect(error).not.to.exist; done(); });

      })
      .catch(error => { throw error; });
  });

  it('should write, read a utf8 file with "utf8" option to writeFile', function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.promises.writeFile('/myfile', contents, 'utf8') 
      .then( () => {

        fs.promises.readFile('/myfile', 'utf8')
          .then( (data, error) => { expect(data).to.equal(contents); expect(error).not.to.exist; done(); });

      })  
      .catch(error => { throw error; });
  });

  it('should write, read a utf8 file with {encoding: "utf8"} option to writeFile', function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.promises.writeFile('/myfile', contents, { encoding: 'utf8' })
      .then( () => {

        fs.promises.readFile('/myfile', 'utf8')
          .then( (data, error) => { expect(data).to.equal(contents); expect(error).not.to.exist; done(); });

      }) 
      .catch(error => { throw error; });
  });

  it('should write, read a binary file', function(done) {
    var fs = util.fs();
    // String and utf8 binary encoded versions of the same thing: 'This is a file.'
    var binary = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

    fs.promises.writeFile('/myfile', binary)
      .then( () => {

        fs.promises.readFile('/myfile')
          .then( (data, error) => { expect(data).to.deep.equal(binary); expect(error).not.to.exist; done(); });

      }) 
      .catch(error => { throw error; });
  });

  it('should follow symbolic links', function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';

    fs.promises.writeFile('/myfile', '', { encoding: 'utf8' })
      .then( () => {
        fs.promises.symlink('/myfile', '/myFileLink')
          .then( () => {
            fs.promises.writeFile('/myFileLink', contents, 'utf8')
              .then( () => {

                fs.promises.readFile('/myFileLink', 'utf8')
                  .then( (data, error) => { expect(data).to.equal(contents); expect(error).not.to.exist; done(); });
                  
              }) 
              .catch(error => { throw error; });   
          }) 
          .catch(error => { throw error; });
      }) 
      .catch(error => { throw error; });
  });
});


