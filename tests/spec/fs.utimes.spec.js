define(["Filer", "util"], function(Filer, util) {

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
          expect(error.name).to.equal('EInvalid');
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
          expect(error.name).to.equal('EInvalid');
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
          expect(error.name).to.equal('EInvalid');
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
        expect(error.name).to.equal('ENoEntry');
        done();
      });
    });

    it('should error when mtime is an invalid number', function(done) {
      var fs = util.fs();

      fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        fs.utimes('/testfile', Date.now(), 'invalid datetime', function (error) {
          expect(error).to.exist;
          expect(error.name).to.equal('EInvalid');
          done();
        });
      });
    });

    it('should error when file descriptor is invalid', function(done) {
      var fs = util.fs();
      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      fs.futimes(1, atime, mtime, function (error) {
        expect(error).to.exist;
        expect(error.name).to.equal('EBadFileDescriptor');
        done();
      });
    });

    it('should change atime and mtime of a file path', function(done) {
      var fs = util.fs();
      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        fs.utimes('/testfile', atime, mtime, function (error) {
          expect(error).not.to.exist;

          fs.stat('/testfile', function (error, stat) {
            expect(error).not.to.exist;
            expect(stat.atime).to.equal(atime);
            expect(stat.mtime).to.equal(mtime);
            done();
          });
        });
      });
    });

    it ('should change atime and mtime for a valid file descriptor', function(done) {
      var fs = util.fs();
      var ofd;
      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      fs.open('/testfile', 'w', function (error, result) {
        if (error) throw error;

        ofd = result;
        fs.futimes(ofd, atime, mtime, function (error) {
          expect(error).not.to.exist;

          fs.fstat(ofd, function (error, stat) {
            expect(error).not.to.exist;
            expect(stat.atime).to.equal(atime);
            expect(stat.mtime).to.equal(mtime);
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
            expect(stat.atime).to.equal(atime);
            expect(stat.mtime).to.equal(mtime);
            done();
          });
        });
      });
    });

    it('should update atime and mtime using current time if arguments are null', function(done) {
      var fs = util.fs();
      var atimeEst;
      var mtimeEst;
      var now;

      fs.writeFile('/myfile', '', function (error) {
        if (error) throw error;

        fs.utimes('/myfile', null, null, function (error) {
          expect(error).not.to.exist;

          now = Date.now();

          fs.stat('/myfile', function (error, stat) {
            expect(error).not.to.exist;
            // Note: testing estimation as time may differ by a couple of milliseconds
            // This number should be increased if tests are on slow systems
            expect(now - stat.atime).to.be.below(75);
            expect(now - stat.mtime).to.be.below(75);
            done();
          });
        });
      });
    });
  });
});
