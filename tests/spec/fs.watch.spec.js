var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.watch', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.watch).to.equal('function');
  });

  it('should get a change event when writing a file', function(done) {
    var fs = util.fs();

    var watcher = fs.watch('/myfile', function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal('/myfile');
      watcher.close();
      done();
    });

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    });
  });

  it('should get a change event when writing a file beneath root dir with recursive=true', function(done) {
    var fs = util.fs();

    var watcher = fs.watch('/', { recursive: true }, function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal('/');
      watcher.close();
      done();
    });

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    });
  });

  it('should get a change event when writing a file in a dir with recursive=true', function(done) {
    var fs = util.fs();

    fs.mkdir('/foo', function(err) {
      if(err) throw err;

      var watcher = fs.watch('/foo', { recursive: true }, function(event, filename) {
        expect(event).to.equal('change');
        expect(filename).to.equal('/foo');
        watcher.close();
        done();
      });

      // This shouldn't produce a change event
      fs.writeFile('/myfile-not-in-foo', 'data', function(error) {
        if(error) throw error;
      });

      // This should
      fs.writeFile('/foo/myfile', 'data', function(error) {
        if(error) throw error;
      });
    });
  });
});
