'use strict';
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.readdir fails when passing options, issue775', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  function setup(fs, dir, cb) {
    fs.mkdir(dir, undefined, (err) => {
      if (err) {
        cb(err);
      }
      else {
        fs.writeFile(dir + '/file', '', (err) => {
          if (err) {
            cb(err);
          }
          else {
            fs.mkdir(dir + '/folder', (err) => {
              if (err) {
                cb(err);
              }
              else {
                fs.symlink(dir + '/file', dir + '/symlink', (err) => {
                  if (err) {
                    cb(err);
                  }
                  else {
                    cb();
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  it('should create a directory, add a file, folder and symbolic link then call fs.readdir with buffer encoding', function (done) {
    var fs = util.fs();
    setup(fs, '/test_dir', (err) => {
      if (err) {
        done(err);
      }
      fs.readdir('/test_dir', 'buffer', (err, data) => {
        if (err) {
          done(err);
        }
        else {
          expect(data).to.have.length(3);

          expect(data[0].toString()).to.equal('file');
          expect(data[1].toString()).to.equal('folder');
          expect(data[2].toString()).to.equal('symlink');

          done();
        }
      });
    });
  });

  it('should create a directory, add a file, folder and symbolic link then call fs.readdir with withFileTypes and encoding options', function (done) {
    var fs = util.fs();
    setup(fs, '/test_dir', (err) => {
      if (err) {
        done(err);
      }
      fs.readdir('/test_dir', { encoding: 'base64', withFileTypes: true }, (err, data) => {
        if (err) {
          done(err);
        }
        else {
          expect(data).to.have.length(3);

          expect(Buffer.from(data[0].name, 'base64').toString()).to.equal('file');
          expect(Buffer.from(data[1].name, 'base64').toString()).to.equal('folder');
          expect(Buffer.from(data[2].name, 'base64').toString()).to.equal('symlink');

          expect(data[0].isFile()).to.be.true;
          expect(data[1].isDirectory()).to.be.true;
          expect(data[2].isSymbolicLink()).to.be.true;

          done();
        }
      });
    });
  });

  it('should create a directory then call fs.readdir without options', function (done) {
    var fs = util.fs();
    setup(fs, '/test_dir', (err) => {
      if (err) {
        done(err);
      }
      else {
        fs.readdir('/test_dir', (err, data) => {
          if (err) {
            done(err);
          }
          else {
            expect(data).to.have.length(3);

            expect(data[0]).to.equal('file');
            expect(data[1]).to.equal('folder');
            expect(data[2]).to.equal('symlink');

            done();
          }
        });
      }
    });
  });
});
