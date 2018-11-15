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

  it('should return no error if file does exist', function (done) {
    
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

});
