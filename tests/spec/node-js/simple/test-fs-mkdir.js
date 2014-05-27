var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  // Based on test1 from https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js
  it('should create a dir without a mode arg', function(done) {
    var pathname = '/test1';
    var fs = util.fs();

    fs.mkdir(pathname, function(error) {
      if(error) throw error;
      fs.stat(pathname, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('DIRECTORY');
        done();
      });
    });
  });

  // Based on test2 https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js
  it('should create a dir with a mode arg', function(done) {
    var pathname = '/test2';
    var fs = util.fs();

    fs.mkdir(pathname, 511 /*=0777*/, function(error) {
      if(error) throw error;
      fs.stat(pathname, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;
        expect(result.type).to.equal('DIRECTORY');
        done();
      });
    });
  });
});
