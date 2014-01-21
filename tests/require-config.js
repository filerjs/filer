/**
 * Add spec files to the list in test-manifest.js
 */

// Dynamically figure out which source to use (dist/ or src/) based on
// query string:
//
// ?filer-dist/filer.js     --> use dist/filer.js
// ?filer-dist/filer.min.js --> use dist/filer.min.js
// ?<default>               --> (default) use src/filer.js with require
var filerArgs = window.filerArgs = {};
var config = (function() {
  var query = window.location.search.substring(1);
  query.split('&').forEach(function(pair) {
    pair = pair.split('=');
    var key = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);
    if(key.indexOf('filer-') === 0) {
      filerArgs[ key.replace(/^filer-/, '') ] = value;
    }
  });

  // Support dist/filer.js
  if(filerArgs['filer-dist/filer.js']) {
    return {
      paths: {
        "tests": "../tests",
        "spec": "../tests/spec",
        "bugs": "../tests/bugs",
        "util": "../tests/lib/test-utils",
        "Filer": "../dist/filer"
      },
      baseUrl: "../lib",
      optimize: "none"
    };
  }

  // Support dist/filer.min.js
  if(filerArgs['filer-dist/filer.min.js']) {
    return {
      paths: {
        "tests": "../tests",
        "spec": "../tests/spec",
        "bugs": "../tests/bugs",
        "util": "../tests/lib/test-utils",
        "Filer": "../dist/filer.min"
      },
      baseUrl: "../lib",
      optimize: "none"
    };
  }

  // Support src/ filer via require
  return {
    paths: {
      "tests": "../tests",
      "src": "../src",
      "spec": "../tests/spec",
      "bugs": "../tests/bugs",
      "util": "../tests/lib/test-utils",
      "Filer": "../src/index"
    },
    baseUrl: "../lib",
    optimize: "none",
    shim: {
      // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
      // and we use a fake one for reduced size, since we only care about utf8.
      "encoding": {
        deps: ["encoding-indexes-shim"]
      }
    }
  };
}());

require.config(config);

// Intentional globals
assert = chai.assert;
expect = chai.expect;

// We need to setup describe() support before loading tests
mocha.setup("bdd");

require(["tests/test-manifest"], function() {
  window.onload = function() {
    mocha.checkLeaks();
    mocha.run();
  };
});
