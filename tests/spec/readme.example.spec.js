const { path } = require('../../src');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('README example code', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should run the code in the README overview example', function(done) {
    // Slightly modified version of the first example code in the README
    // See <a name="overviewExample"></a>
    const fs = util.fs();

    fs.mkdir('/docs', (err) => {
      if (err) throw err;
      
      const filename = path.join('/docs', 'first.txt');
      const data = 'Hello World!\n';
    
      fs.writeFile(filename, data, (err) => {
        if (err) throw err;
    
        fs.stat(filename, (err, stats) => {
          if (err) throw err;
          expect(stats.size).to.equal(data.length);
          done();
        });
      });
    });
  });

  it('should run the fsPromises example code', function() {
    const fs = util.fs().promises;
    const filename = '/myfile';
    const data = 'some data';

    return fs.writeFile(filename, data)
      .then(() => fs.stat(filename))
      .then(stats => { 
        expect(stats.size).to.equal(data.length);
      });
  });
});
