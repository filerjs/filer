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

  it('should throw an error if a file is deleted', function() {
    const fs = util.fs(); 
    
    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    });  

    fs.watchFile('/myfile', function(prev, curr) {
      expect(prev).to.exist;
      expect(curr).to.exist;
    }); 

    fs.unlink('/myfile'); 

    const fn = () => fs.watchFile('/myfile');
    expect(fn).to.throw();
  });

  it('prev and curr should be equal if nothing has been changed in the file', function() {
    const fs = util.fs(); 

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    }); 
    
    fs.watchFile('/myfile', function(prev, curr) {
      expect(prev).to.equal(curr);
    });
  });

  it('prev and curr should not be equal if something has been changed in the file', function() {
    const fs = util.fs(); 

    fs.writeFile('/myfile', 'data', function(error) {
      if(error) throw error;
    }); 

    fs.watchFile('/myfile', function(prev, curr) {
      expect(prev).to.equal(curr);

      fs.writeFile('/myfile', 'data2', function(error) {
        if(error) throw error;
      }); 
      
      expect(prev).to.not.equal(curr);
    });
  });
});