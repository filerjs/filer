/**
 * https://github.com/js-platform/filer/pull/225
 *
 * NOTE: this test has to be run outside the browserify step,
 * since combinining require for node.js/browserify builds with
 * r.js doesn't work.
 */

var requirejs = require('requirejs');
var expect = require('chai').expect;

// browser-request assumes access to XHR
GLOBAL.XMLHttpRequest = {};

describe('require.js should be able to use built Filer, issue 225', function() {

  it('should properly load Filer as an AMD module, with Buffer included', function(done) {
    requirejs.config({
      baseUrl: __dirname,
      paths: {
        "filer": "../../dist/filer-issue225"
      },
      nodeRequire: require
    });

    requirejs(["filer"], function(Filer) {
      expect(Filer).to.exist;
      expect(Filer.Buffer).to.exist;

      var fs = new Filer.FileSystem({provider: new Filer.FileSystem.providers.Memory()});

      var buf = new Filer.Buffer([1, 2, 3]);
      fs.writeFile('/file', buf, function(err) {
        expect(err).not.to.exist;

        fs.readFile('/file', function(err, data) {
          expect(err).not.to.exist;
          expect(data).to.deep.equal(buf);
          done();
        });
      });
    });
  });
});
