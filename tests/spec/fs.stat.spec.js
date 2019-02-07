var util = require('../lib/test-utils.js');
var chai = require('chai');
chai.use(require('chai-datetime'));
var expect = chai.expect;

describe('fs.stat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(typeof fs.stat).to.equal('function');
  });

  it('should return an error if path does not exist', function(done) {
    var fs = util.fs();

    fs.stat('/tmp', function(error, result) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      expect(result).not.to.exist;
      done();
    });
  });

  it('should return a stat object if path exists', function(done) {
    var fs = util.fs();

    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;

      expect(result['node']).to.be.a('string');
      expect(result['dev']).to.equal(fs.name);
      expect(result['size']).to.be.a('number');
      expect(result['nlinks']).to.be.a('number');
      expect(result['atime']).to.be.a('date');
      expect(result['mtime']).to.be.a('date');
      expect(result['ctime']).to.be.a('date');
      expect(result['atimeMs']).to.be.a('number');
      expect(result['mtimeMs']).to.be.a('number');
      expect(result['ctimeMs']).to.be.a('number');
      expect(result['type']).to.equal('DIRECTORY');

      done();
    });
  });

  it('should return a stat object with equal Date and Unix Timestamps', function(done) {
    var fs = util.fs();

    fs.stat('/', function(error, result) {
      expect(error).not.to.exist;
      expect(result).to.exist;

      expect(result['atime']).to.be.a('date');
      expect(result['mtime']).to.be.a('date');
      expect(result['ctime']).to.be.a('date');

      expect(result.atime.getTime()).to.equal(result.atimeMs);
      expect(result.mtime.getTime()).to.equal(result.mtimeMs);
      expect(result.ctime.getTime()).to.equal(result.ctimeMs);

      done();
    });
  });


  it('should follow symbolic links and return a stat object for the resulting path', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w', function(error, result) {
      if(error) throw error;
      var fd = result;
      fs.close(fd, function(error) {
        if(error) throw error;
        fs.stat('/myfile', function(error, result) {
          if(error) throw error;

          expect(result['node']).to.exist;
          fs.symlink('/myfile', '/myfilelink', function(error) {
            if(error) throw error;

            fs.stat('/myfilelink', function(error, result) {
              expect(error).not.to.exist;
              expect(result).to.exist;
              expect(result['node']).to.exist;
              done();
            });
          });
        });
      });
    });
  });

  it('should return a stat object for a valid descriptor', function(done) {
    var fs = util.fs();

    fs.open('/myfile', 'w+', function(error, fd) {
      if(error) throw error;

      fs.fstat(fd, function(error, result) {
        expect(error).not.to.exist;
        expect(result).to.exist;

        expect(result['node']).to.exist;
        expect(result['dev']).to.equal(fs.name);
        expect(result['size']).to.be.a('number');
        expect(result['nlinks']).to.be.a('number');
        expect(result['atime']).to.be.a('date');
        expect(result['mtime']).to.be.a('date');
        expect(result['ctime']).to.be.a('date');
        expect(result['atimeMs']).to.be.a('number');
        expect(result['mtimeMs']).to.be.a('number');
        expect(result['ctimeMs']).to.be.a('number');
        expect(result['type']).to.equal('FILE');

        fs.close(fd, done);
      });
    });
  });

  it('(promise) should be a function', function() {
    var fs = util.fs();
    expect(fs.promises.stat).to.be.a('function');
  });
  
  it('should return a promise', function() {
    var fs = util.fs();

    var p = fs.promises.stat('/');
    expect(p).to.be.a('Promise');
    return p;
  });
  
  it('(promise) should return a stat object if file exists', function() {
    var fs = util.fs();

    return fs.promises
      .stat('/')
      .then(result => { 
        expect(result).to.exist;

        expect(result.node).to.be.a('string');
        expect(result.dev).to.equal(fs.name);
        expect(result.size).to.be.a('number');
        expect(result.nlinks).to.be.a('number');
        expect(result['atime']).to.be.a('date');
        expect(result['mtime']).to.be.a('date');
        expect(result['ctime']).to.be.a('date');
        expect(result['atimeMs']).to.be.a('number');
        expect(result['mtimeMs']).to.be.a('number');
        expect(result['ctimeMs']).to.be.a('number');
        expect(result.isDirectory()).to.be.true;
      }); 
  });

  it('should set appropriate time and timeMs values when creating a file', function(done) {
    var fs = util.fs();

    // Make sure that all times on a file node are within a 1 minute window
    var before = new Date();
    var oneMinuteLater = new Date();
    oneMinuteLater.setMinutes(oneMinuteLater.getMinutes() + 1);

    fs.writeFile('/file', 'data', function(error) {
      if(error) throw error;

      fs.stat('/file', function(error, stats) {
        if(error) throw error;

        expect(new Date(stats.ctimeMs)).to.be.withinDate(before, oneMinuteLater);
        expect(stats.ctime).to.be.withinDate(before, oneMinuteLater);

        expect(new Date(stats.atimeMs)).to.be.withinDate(before, oneMinuteLater);
        expect(stats.atime).to.be.withinDate(before, oneMinuteLater);

        expect(new Date(stats.mtimeMs)).to.be.withinDate(before, oneMinuteLater);
        expect(stats.mtime).to.be.withinDate(before, oneMinuteLater);

        done();
      });
    });
  });

  it('should set appropriate time and timeMs values when creating a file', function(done) {
    var fs = util.fs();

    fs.writeFile('/file', 'data', function(error) {
      if(error) throw error;

      var newAtime = new Date('1 Oct 2000 15:33:22');
      var newMtime = new Date('30 Sep 2000 06:43:54');

      fs.utimes('/file', newAtime, newMtime, function(error) {
        if(error) throw error;

        fs.stat('/file', function(error, stats) {
          if(error) throw error;

          // ctime should match newMtime
          expect(stats.ctimeMs).to.equal(newMtime.getTime());
          expect(stats.ctime).to.equalDate(newMtime);

          // atime should match newAtime
          expect(stats.atimeMs).to.equal(newAtime.getTime());
          expect(stats.atime).to.equalDate(newAtime);

          // mtime should match newMtime
          expect(stats.mtimeMs).to.equal(newMtime.getTime());
          expect(stats.mtime).to.equalDate(newMtime);

          done();
        });
      });
    });
  });
});

/**
 * fsPromises tests
 */

describe('fsPromises.stat', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should return an error if path does not exist', function() {
    var fsPromises = util.fs().promises;

    return fsPromises.stat('/tmp')
      .catch(error => {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOENT');
      });
  });
});
