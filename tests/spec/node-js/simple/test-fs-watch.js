var Filer = require('../../../..');
var util = require('../../../lib/test-utils.js');
var expect = require('chai').expect;

/**
 * NOTE: unlike node.js, which either doesn't give filenames (e.g., in case of
 * fd vs. path) for events, or gives only a portion thereof (e.g., basname),
 * we give full, abs paths always.
 */
var filenameOne = '/watch.txt';
var filenameTwo = '/hasOwnProperty';

describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-watch.js", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should get change event for writeFile() using FSWatcher object', function(done) {
    var fs = util.fs();
    var changes = 0;

    var watcher = fs.watch(filenameOne);
    watcher.on('change', function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal(filenameOne);

      // Make sure only one change event comes in (i.e., close() works)
      changes++;
      watcher.close();

      fs.writeFile(filenameOne, 'hello again', function(error) {
        expect(changes).to.equal(1);
        done();
      });
    });

    fs.writeFile(filenameOne, 'hello');
  });

  it('should get change event for writeFile() using fs.watch() only', function(done) {
    var fs = util.fs();
    var changes = 0;

    var watcher = fs.watch(filenameTwo, function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal(filenameTwo);

      watcher.close();
      done();
    });

    fs.writeFile(filenameTwo, 'pardner');
  });

  it('should allow watches on dirs', function(done) {
    var fs = util.fs();
    fs.mkdir('/tmp', function(error) {
      if(error) throw error;

      var watcher = fs.watch('/tmp', function(event, filename) {
// TODO: node thinks this should be 'rename', need to add rename along with change.
        expect(event).to.equal('change');
        expect(filename).to.equal('/tmp');
        watcher.close();
        done();
      });

      fs.open('/tmp/newfile.txt', 'w', function(error, fd) {
        if(error) throw error;
        fs.close(fd);
      });
    });
  });
});
