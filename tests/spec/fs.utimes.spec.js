var util = require('../lib/test-utils.js');
var chai = require('chai');
chai.use(require('chai-datetime'));
var expect = chai.expect;

describe('fs.utimes', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var fs = util.fs();
    expect(fs.utimes).to.be.a('function');
  });

  it('should error when atime is negative', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.utimes('/testfile', -1, Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when mtime is negative', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), -1, function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when atime is as invalid number', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', 'invalid datetime', Date.now(), function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when path does not exist', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.utimes('/pathdoesnotexist', atime, mtime, function (error) {
      expect(error).to.exist;
      expect(error.code).to.equal('ENOENT');
      done();
    });
  });

  it('should error when mtime is an invalid number', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', Date.now(), 'invalid datetime', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should change atime and mtime of a file path with Date', function(done) {
    var fs = util.fs();
    var atime = new Date('1 Oct 2000 15:33:22');
    var mtime = new Date('30 Sep 2000 06:43:54');

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testfile', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.atime).to.equalDate(atime);
          expect(stat.mtime).to.equalDate(mtime);
          done();
        });
      });
    });
  });

  it('should change atime and mtime of a file path with Unix timestamp', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.utimes('/testfile', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testfile', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.atimeMs).to.equal(atime);
          expect(stat.mtimeMs).to.equal(mtime);
          done();
        });
      });
    });
  });

  it('should update atime and mtime of directory path', function(done) {
    var fs = util.fs();
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    fs.mkdir('/testdir', function (error) {
      if (error) throw error;

      fs.utimes('/testdir', atime, mtime, function (error) {
        expect(error).not.to.exist;

        fs.stat('/testdir', function (error, stat) {
          expect(error).not.to.exist;
          expect(stat.mtimeMs).to.equal(mtime);
          done();
        });
      });
    });
  });

  it('should update atime and mtime using current time if arguments are null', function(done) {
    var fs = util.fs();

    fs.writeFile('/myfile', '', function (error) {
      if (error) throw error;

      var then = Date.now();
      fs.utimes('/myfile', null, null, function (error) {
        expect(error).not.to.exist;

        fs.stat('/myfile', function (error, stat) {
          expect(error).not.to.exist;
          // Note: testing estimation as time may differ by a couple of milliseconds
          // This number should be increased if tests are on slow systems
          var delta = Date.now() - then;
          expect(then - stat.atimeMs).to.be.at.most(delta);
          expect(then - stat.mtimeMs).to.be.at.most(delta);
          done();
        });
      });
    });
  });
});

describe('fs.promises.utimes', function () {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs().promises;
    expect(fs.utimes).to.be.a('function');
  });

  it('should error when atime is negative', function () {
    var fs = util.fs().promises;

    return fs
      .writeFile('/testfile', '')
      .then(() => fs.utimes('/testfile', -1, Date.now()))
      .catch(function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
      });
  });

  it('should error when mtime is negative', function () {
    var fs = util.fs().promises;

    return fs
      .writeFile('/testfile', '')
      .then(() => fs.utimes('/testfile', Date.now(), -1))
      .catch(function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
      });
  });

  it('should error when mtime is an invalid number', function () {
    var fs = util.fs().promises;

    return fs
      .writeFile('/testfile', '')
      .then(() => fs.utimes('/testfile', Date.now(), 'invalid datetime'))
      .catch(function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
      });
  });

  it('should change atime and mtime of a file path', function () {
    var fs = util.fs().promises;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    return fs
      .writeFile('/testfile', '')
      .then(() => fs.utimes('/testfile', atime, mtime))
      .then(() => fs.stat('/testfile'))
      .then(stat => expect(stat.mtimeMs).to.equal(mtime));
  });

  it('should update atime and mtime of directory path', function () {
    var fs = util.fs().promises;
    var atime = Date.parse('1 Oct 2000 15:33:22');
    var mtime = Date.parse('30 Sep 2000 06:43:54');

    return fs
      .mkdir('/testdir')
      .then(() => fs.utimes('/testdir', atime, mtime))
      .then(() => fs.stat('/testdir'))
      .then(stat => {
        expect(stat.mtimeMs).to.equal(mtime);
      });
  });

  it('should update atime and mtime using current time if arguments are null', function () {
    var fs = util.fs().promises;
    var t1;

    return fs
      .writeFile('/myfile', '')
      .then(() => {
        t1 = Date.now();
        return fs.utimes('/myfile', null, null);
      })
      .then(() => fs.stat('/myfile'))
      .then(stat => {
        // Note: testing estimation as time may differ by a couple of milliseconds
        // This number should be increased if tests are on slow systems
        var delta = Date.now() - t1;
        expect(t1 - stat.atimeMs).to.be.at.most(delta);
        expect(t1 - stat.mtimeMs).to.be.at.most(delta);
      });
  });
});
