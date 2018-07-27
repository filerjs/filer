var Filer = require('../../src');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var async = require('../../lib/async.js');

describe('sh.ls and deep directory trees', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should not crash when calling sh.ls() on deep directory layouts', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    var path = '';
    for(var i=0; i<50; i++) {
      path += '/' + i;
    }

    sh.mkdirp(path, function(err) {
      if(err) throw err;

      sh.ls('/', {recursive: true}, function(err, listing) {
        expect(err).not.to.exist;
        expect(listing).to.exist;
        done();
      });
    });
  }).timeout(15000);

  it('should not crash when calling sh.ls() on wide directory layouts', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    var dirName = '/dir';

    fs.mkdir(dirName, function(err) {
      if(err) throw err;

      var paths = [];
      for(var i=0; i<100; i++) {
        paths.push(Filer.Path.join(dirName, ''+i));
      }

      function writeFile(path, callback) {
        fs.writeFile(path, 'data', callback);
      }

      async.eachSeries(paths, writeFile, function(err) {
        if(err) throw err;

        sh.ls('/', {recursive: true}, function(err, listing) {
          expect(err).not.to.exist;
          expect(listing).to.exist;
          done();
        });
      });
    });
  }).timeout(15000);
});
