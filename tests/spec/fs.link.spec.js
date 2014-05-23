var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.link', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.link).to.be.a('function');
  });

  it('should create a link to an existing file', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.close(fd, function(error) {
        if(error) throw error;

        fs.link('/myfile', '/myotherfile', function(error) {
          if(error) throw error;

          fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            var _oldstats = result;
            fs.stat('/myotherfile', function(error, result) {
              expect(error).not.to.exist;
              expect(result.nlinks).to.equal(2);
              expect(result.dev).to.equal(_oldstats.dev);
              expect(result.node).to.equal(_oldstats.node);
              expect(result.size).to.equal(_oldstats.size);
              expect(result.type).to.equal(_oldstats.type);
              done();
            });
          });
        });
      });
    });
  });

  it('should not follow symbolic links', function(done) {
    var fs = util.fs();

    fs.stat('/', function (error, result) {
      if (error) throw error;
      var _oldstats = result;
      fs.symlink('/', '/myfileLink', function (error) {
        if (error) throw error;
        fs.link('/myfileLink', '/myotherfile', function (error) {
          if (error) throw error;
          fs.lstat('/myfileLink', function (error, result) {
            if (error) throw error;
            var _linkstats = result;
            fs.lstat('/myotherfile', function (error, result) {
              expect(error).not.to.exist;
              expect(result.dev).to.equal(_linkstats.dev);
              expect(result.node).to.equal(_linkstats.node);
              expect(result.size).to.equal(_linkstats.size);
              expect(result.type).to.equal(_linkstats.type);
              expect(result.nlinks).to.equal(2);
              done();
            });
          });
        });
      });
    });
  });
});
