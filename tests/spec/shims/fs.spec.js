'use strict';
const expect = require('chai').expect;
const utils = require('../../lib/test-utils');
const fs = utils.shimIndexedDB(() => require('../../../shims/fs').default);

describe.only('fs shim', () => {
  it('should be defined', () => {
    expect(fs).to.not.be.undefined;
  });

  it('should be an object', () => {
    expect(typeof fs).to.equal('object');
  });

  it('should return a function when accessing fs.writeFile', () => {
    expect(typeof fs.writeFile).to.equal('function');
  });

  it('should call callback when calling fs.writeFile', (done) => {
    fs.writeFile('/test.txt', 'test', function(err) {
      if(err) throw err;

      done();
    });
  });

  it('should return an object when accessing fs.promises', () => {
    expect(typeof fs.promises).to.equal('object');
  });

  it('should return a function when accessing fs.promises.writeFile', () => {
    expect(typeof fs.promises.writeFile).to.equal('function');
  });

  it('should return a promise which resolves when calling fs.promises.writeFile', (done) => {
    const writeFilePromise = fs.promises.writeFile('/test2.txt', '');
    expect(writeFilePromise instanceof Promise).to.equal(true);
    writeFilePromise.then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
