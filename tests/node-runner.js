var requirejs = require('requirejs');

requirejs.config({
  paths: {
    "tests": "../tests",
    "src": "../src",
    "spec": "../tests/spec",
    "bugs": "../tests/bugs",
    "util": "../tests/lib/test-utils",
    // see gruntfile.js for how dist/filer-test.js gets built
    "Filer": "../dist/filer-test"
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

GLOBAL.document = {};
GLOBAL.navigator = { userAgent: ""};
GLOBAL.window = {
  addEventListener: function(){},
  navigator: navigator,
  document: document,
  setTimeout: setTimeout
};
GLOBAL.expect = require('chai').expect;

describe("Mocha needs one test in order to wait on requirejs tests", function() {
  it('should wait for other tests', function(){
    require('assert').ok(true);
  });
});

requirejs(["tests/test-manifest"]);
