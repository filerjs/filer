'use strict';
const util = require('../lib/test-utils.js');

describe('fs.mkdir does not recursively create parent directories when called with { recursive: true }, issue776', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it.skip('should not throw when calling fs.mkdir with recursive flag set', function(done) {
    const fs = util.fs();
    fs.mkdir('/test_dir/a/b', { recursive: true }, done);
  });
});
