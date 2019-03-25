'use strict';

var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.watchFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.watchFile).to.equal('function');
  });

  /*
  it('should get a change event when writing a file', function(done) {
    const fs = util.fs();

    fs.watchFile('/myfile.txt', function(event, filename) {
      expect(event).to.equal('change');
      expect(filename).to.equal('/myfile.txt');
      watcher.close();
      done();
    });

    fs.writeFile('/myfile.txt', 'data', function(error) {
      if(error) throw error;
    });
  });
  */
});