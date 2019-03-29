'use strict';

var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.watchFile', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    const fs = util.fs();
    expect(typeof fs.watchFile).to.equal('function');
  });

  it('should throw an error if a file path is not defined', function() { 
    const fs = util.fs();
    
    const fn = () => fs.watchFile(undefined);
    expect(fn).to.throw();
  });

  it('prev and curr should be populated', function() {
    const fs = util.fs(); 

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    }); 
    
    fs.watchFile('/myfile', function(prev, curr) {
      expect(prev).to.exist;
      expect(curr).to.exist;
    });
  });
});