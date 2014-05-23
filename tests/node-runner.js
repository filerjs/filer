// We use Chai's expect assertions in all the tests via a global
GLOBAL.expect = require('chai').expect;

// Tests to be run are defined in test-manifest.js
require('./test-manifest.js');
