var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

/**
 * NOTE: unlike node.js, which either doesn't give filenames (e.g., in case of
 * fd vs. path) for events, or gives only a portion thereof (e.g., basname),
 * we give full, abs paths always.
 */
describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-watch-recursive.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should get change event for writeFile() under a recursive watched dir', function(done) {
    var fs = util.fs();

    fs.mkdir('/test', function(error) {
      if(error) throw error;

      fs.mkdir('/test/subdir', function(error) {
        if(error) throw error;

        var watcher = fs.watch('/test', {recursive: true});
        watcher.on('change', function(event, filename) {
          expect(event).to.equal('change');
          // Expect to see that a new file was created in /test/subdir
          expect(filename).to.equal('/test/subdir');
          watcher.close();
          done();
        });

        fs.writeFile('/test/subdir/watch.txt', 'world');
      });
    });
  });
});
