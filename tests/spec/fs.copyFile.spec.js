var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

// Waiting on implementation to land https://github.com/filerjs/filer/issues/436
describe.skip('fs.copyFile', function() {
  const file = {
    path: '/srcfile',
    contents: 'This is a src file.'
  };

  beforeEach(function(done){
    util.setup(function() {
      var fs = util.fs();
      fs.writeFile(file.path, file.contents, done);
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.copyFile).to.be.a('function');
  });

  it('should return an error if the src path does not exist', function(done){
    var fs = util.fs();

    fs.copyFile(null, '/dest.txt', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should copy file successfully', function(done) {
    var fs = util.fs();
    const destPath = '/destfile';

    fs.copyFile(file.path, destPath, function(error) {
      if(error) throw error;

      fs.readFile(destPath, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.equal(file.contents);
        done();
      });
    });
  });
});
