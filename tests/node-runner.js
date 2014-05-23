// If there's something broken in filer or a test,
// requirejs can blow up, and mocha sees it as tests
// not getting added (i.e., it just exists with only
// 1 test run). Display an error and crash loudly
// so it's clear what happened.
process.on('uncaughtException', function(err) {
  describe('requirejs errors: ', function() {
    it('requirejs has crashed building the test suite...', function(done) {
      console.error(err.stack);
      require('assert').ok(false);
    });
  });
});

var requirejs = require('requirejs');
requirejs.config({
  paths: {
    "tests": "../tests",
    "src": "../src",
    "spec": "../tests/spec",
    "bugs": "../tests/bugs",
    "util": "../tests/lib/test-utils",
    // see gruntfile.js for how dist/filer-test.js gets built
    "Filer": "../dist/filer_node-test"
  },
  baseUrl: "./lib",
  optimize: "none",
  shim: {
    // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
    // and we use a fake one for reduced size, since we only care about utf8.
    "encoding": {
      deps: ["encoding-indexes-shim"]
    }
  },
  nodeRequire: require
});

// We use Chai's expect assertions in all the tests via a global
GLOBAL.expect = require('chai').expect;

// Workaround for Mocha bug, see https://github.com/visionmedia/mocha/issues/362
describe("Mocha needs one test in order to wait on requirejs tests", function() {
  it('should wait for other tests', function(){
    require('assert').ok(true);
  });
});

requirejs(["tests/test-manifest"]);
