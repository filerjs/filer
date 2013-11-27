/**
 * Assembles fs.js at runtime in the browswer, as well as all test
 * spec files.  Add spec files to the list in test-manifest.js
 */

require.config({
  paths: {
    "tests": "../tests",
    "src": "../src",
    "spec": "../tests/spec",
    "IDBFS": "../src/fs"
  },
  baseUrl: "../lib",
  optimize: "none"
});

require(["tests/test-manifest"], function() {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 1000;

  var htmlReporter = new jasmine.HtmlReporter();

  jasmineEnv.addReporter(htmlReporter);

  jasmineEnv.specFilter = function(spec) {
    return htmlReporter.specFilter(spec);
  };

  var currentWindowOnload = window.onload;

  window.onload = function() {
    if (currentWindowOnload) {
      currentWindowOnload();
    }
    execJasmine();
  };

  function execJasmine() {
    jasmineEnv.execute();
  }
});
