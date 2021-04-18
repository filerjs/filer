// Include the mocha css
require('mocha/mocha.css');

// Setup mocha and set it to run tests on window load
require('./setup-mocha');

var path = require('../shims/path').default;
console.log(path.isAbsolute('/a/b'));

// Add any webpack specific tests here e.g. shim tests
require('./spec/shims/fs.spec');
require('./spec/shims/path.spec');
require('./spec/shims/buffer.spec');

// Add any other new tests to `tests/index.js`
require('./index');
