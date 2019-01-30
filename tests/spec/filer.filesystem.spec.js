'use strict';
const Filer = require('../../src');
const util = require('../lib/test-utils.js');
const expect = require('chai').expect;

describe('Filer.FileSystem', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should properly mount new or existing filesystem', function(done) {
    let provider = util.provider().provider;

    // 1) Should be able to open a new filesystem, and get empty root
    let fs1 = new Filer.FileSystem({provider: provider}, function() {
      fs1.readdir('/', function(err, entries) {
        expect(err).not.to.exist;
        expect(entries).to.be.an('array');
        expect(entries.length).to.equal(0);

        fs1.writeFile('/file', 'data', function(err) {
          if(err) throw err;

          // 2) Should be able to open an existing filesystem
          let fs2 = new Filer.FileSystem({provider: provider}, function() {
            fs2.readdir('/', function(err, entries) {
              expect(err).not.to.exist;
              expect(entries).to.be.an('array');
              expect(entries.length).to.equal(1);
              expect(entries[0]).to.equal('file');


              // 3) FORMAT flag should wipe an existing filesystem
              let fs3 = new Filer.FileSystem({provider: provider, flags: ['FORMAT']}, function() {
                fs3.readdir('/', function(err, entries) {
                  expect(err).not.to.exist;
                  expect(entries).to.be.an('array');
                  expect(entries.length).to.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
