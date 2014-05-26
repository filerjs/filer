// Tests to be run are defined in test-manifest.js

// For Nodejs context, expose chai's expect method
if (typeof GLOBAL !== "undefined") {
  GLOBAL.expect = require('chai').expect;
}

require('./test-manifest.js');
