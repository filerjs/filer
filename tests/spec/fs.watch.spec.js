'use strict';

const util   = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.watch', function() {
  // Our watch infrastucture is dependent on document.localStorage
  // see lib/intercom.js. Bail if we don't have access to it.
  before(function() {
    if(typeof global.localStorage === 'undefined') {
      /* eslint no-console: 0 */
      console.log('Skipping fs.watch() tests--not supported in current environment.');
      this.skip();
    }
  });

  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(typeof fs.watch).to.equal('function');
  });

  it('should get a change event when writing a file', function(done) {
    const fs = util.fs();

     watcher = fs.watch('/myfile', function(event, filename) {
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
    const fs = util.fs();

    const watcher = fs.watch('/', { recursive: true }, function(event, filename) {
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
    const fs = util.fs();

    fs.mkdir('/foo', function(err) {
      if(err) throw err;

      const watcher = fs.watch('/foo', { recursive: true }, function(event, filename) {
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

  // Bug to deal with this is filed at https://github.com/filerjs/filer/issues/594
  it.skip('should get a change event when a hardlink is watched and the original file is changed', function(done) {
    const fs = util.fs();

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;

      fs.link('/myfile', '/hardlink', function(error) {
        if(error) throw error;

        const watcher = fs.watch('/hardlink', function(event, filename) {
          expect(event).to.equal('change');
          expect(filename).to.equal('/hardlink');

          watcher.close();

          fs.readFile('/hardlink', 'utf8', function(error, data) {
            if(error) throw error;

            expect(data).to.equal('data...more data');
            done();
          });
        });

        fs.appendFile('/myfile', '...more data', function(error) {
          if(error) throw error;
        });
      });
    });
  });

  it('should get a change event when renaming a file', function(done) {
    const fs = util.fs();

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;

      //Normaly A 'rename' event should be thrown, but filer doesn't support that event at this time.
      //For now renaming a file will throw a change event.
      const watcher = fs.watch('/myfile', function(event, filename) {
        expect(event).to.equal('change');
        expect(filename).to.equal('/myfile');
        watcher.close();
        done();
      });

      fs.rename('/myfile', '/mynewfile', function(error) {
        if(error) throw error;
      });
    });
  });
});
