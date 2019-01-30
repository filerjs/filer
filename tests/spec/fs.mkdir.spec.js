'use strict';
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('fs.mkdir', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    const fs = util.fs();
    expect(fs.mkdir).to.be.a('function');
  });

  it('should return an error if part of the parent path does not exist', function (done) {
    const fs = util.fs();

    fs.mkdir('/tmp/mydir', function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should return an error if the path already exists', function (done) {
    const fs = util.fs();

    fs.mkdir('/', function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EEXIST');
      done();
    });
  });

  it('should make a new directory', function (done) {
    const fs = util.fs();

    fs.mkdir('/tmp', function (error) {
      expect(error).not.to.exist;
      if (error) throw error;

      fs.stat('/tmp', function (error, stats) {
        expect(error).not.to.exist;
        expect(stats).to.exist;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });
  });
});

describe('fs.promises.mkdir', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    const fs = util.fs();
    expect(fs.promises.mkdir).to.be.a('function');
  });

  it('should return an error if part of the parent path does not exist', function () {
    const fs = util.fs();

    return fs.promises.mkdir('/tmp/mydir')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });

  it('should return an error if the path already exists', function () {
    const fs = util.fs();

    return fs.promises.mkdir('/')
      .catch(error =>{
        expect(error).to.exist;
        expect(error.code).to.equal('EEXIST');
      });
  });

  it('should make a new directory', function () {
    const fs = util.fs();

    return fs.promises.mkdir('/tmp')
      .then(() => fs.promises.stat('/tmp'))
      .then(stats => {
        expect(stats).to.exist;
        expect(stats.isDirectory()).to.be.true;
      });
  });

  it('should return a promise', function () {
    const fs = util.fs();
    expect(fs.promises.mkdir('/tmp')).to.be.a('promise');
  });
});