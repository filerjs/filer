'use strict';

const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.appendFile', function() {
  const contents = 'This is a file.';

  beforeEach(function(done) {
    util.setup(function() {
      const fs = util.fs();
      fs.writeFile('/myfile', contents, function(error) {
        if(error) throw error;
        done();
      });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(fs.appendFile).to.be.a('function');
  });

  it('should append a utf8 file without specifying utf8 in appendFile', function(done) {
    const fs = util.fs();
    const more = ' Appended.';

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
    const fs = util.fs();
    const more = ' Appended.';

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
    const fs = util.fs();
    const more = ' Appended.';

    fs.appendFile('/myfile', more, { encoding: 'utf8' }, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', { encoding: 'utf8' }, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });
    
  it('should append without error when explcitly entering encoding and flag options (default values)' , function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';
    var more = ' Appended.';

    fs.appendFile('/myfile', more , {encoding: 'utf8', flag: 'a'}, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', { encoding: 'utf8' }, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append without error when specfifying flag option (default value)' , function(done) {
    var fs = util.fs();
    var contents = 'This is a file.';
    var more = ' Appended.';

    fs.appendFile('/myfile', more , {flag: 'a'}, function(error) {
      if(error) throw error;

      fs.readFile('/myfile', { encoding: 'utf8' }, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });

  it('should append a binary file', function(done) {
    const fs = util.fs();

    // String and utf8 binary encoded versions of the same thing: 'This is a file.'
    const binary = Buffer.from([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);
    const binary2 = Buffer.from([32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);
    const binary3 = Buffer.from([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46,
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
    const fs = util.fs();
    const contents = 'This is a file.';
    const more = ' Appended.';

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
    const fs = util.fs();

    fs.appendFile('/newfile', contents, { encoding: 'utf8' }, function(error) {
      expect(error).not.to.exist;

      fs.readFile('/newfile', 'utf8', function(err, data) {
        if(err) throw err;
        expect(data).to.equal(contents);
        done();
      });
    });
  });
  
  it('should accept numbers and append them to the file', function(done) {
    const fs = util.fs();
    const more = 10000;

    fs.appendFile('/myfile', more, 'utf8', function(error) {
      if(error) throw error;

      fs.readFile('/myfile', 'utf8', function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(contents + more);
        done();
      });
    });
  });
});

describe('fs.promises.appendFile', function() {
  beforeEach(function(done) {
    util.setup(function() {
      const fs = util.fs();
      return fs.promises.writeFile('/myfile', 'This is a file.', { encoding: 'utf8' })
        .then(done)
        .catch(done);
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(fs.promises.appendFile).to.be.a('function');
  });

  it('should append a utf8 file without specifying utf8 in appendFile', function() {
    const fs = util.fs();
    const contents = 'This is a file.';
    const more = ' Appended.';

    return fs.promises.appendFile('/myfile', more)
      .then(() => fs.promises.readFile('/myfile', 'utf8'))
      .then(data => expect(data).to.equal(contents + more));
  });

  it('should append a utf8 file with "utf8" option to appendFile', function() {
    const fs = util.fs();
    const contents = 'This is a file.';
    const more = ' Appended.';

    return fs.promises.appendFile('/myfile', more, 'utf8')
      .then(() => fs.promises.readFile('/myfile', 'utf8'))
      .then(data => expect(data).to.equal(contents + more));
  });

  it('should append a utf8 file with {encoding: "utf8"} option to appendFile', function() {
    const fs = util.fs();
    const contents = 'This is a file.';
    const more = ' Appended.';

    return fs.promises.appendFile('/myfile', more, { encoding: 'utf8' })
      .then(() => fs.promises.readFile('/myfile', { encoding: 'utf8' }))
      .then(data => expect(data).to.equal(contents + more));
  });

  it('should append a binary file', function() {
    const fs = util.fs();

    // String and utf8 binary encoded versions of the same thing: 'This is a file.'
    const binary = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);
    const binary2 = new Buffer([32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);
    const binary3 = new Buffer([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46,
      32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);

    return fs.promises.writeFile('/mybinaryfile', binary)
      .then(() => fs.promises.appendFile('/mybinaryfile', binary2))
      .then(() => fs.promises.readFile('/mybinaryfile', 'ascii'))
      .then(data => expect(data).to.deep.equal(binary3));
  });

  it('should follow symbolic links', function() {
    const fs = util.fs();
    const contents = 'This is a file.';
    const more = ' Appended.';

    return fs.promises.symlink('/myfile', '/myFileLink')
      .then(() => fs.promises.appendFile('/myFileLink', more, 'utf8'))
      .then(() => fs.promises.readFile('/myFileLink', 'utf8'))
      .then(data => expect(data).to.equal(contents + more));
  });

  it('should work when file does not exist, and create the file', function() {
    const fs = util.fs();
    const contents = 'This is a file.';

    return fs.promises.appendFile('/newfile', contents, { encoding: 'utf8' })
      .then(() => fs.promises.readFile('/newfile', 'utf8'))
      .then(data => expect(data).to.equal(contents));
  });
});
