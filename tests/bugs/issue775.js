'use strict';
const util = require('../lib/test-utils.js');

describe('fs.readdir fails when passing options, issue775', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should create a directory then call fs.readdir with options', function (done) {
    const fs = util.fs();
    fs.mkdir('/test_dir', undefined, (err) => {
      if (err) {
        done(err);
      }
      else {
        fs.readdir('/test_dir', { withFileTypes: true }, done);
      }
    });
  });
});
