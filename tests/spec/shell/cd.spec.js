define(["Filer", "util"], function(Filer, util) {

  describe('FileSystemShell.cd', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.cd).to.be.a('function');
    });

    it('should default to a cwd of /', function() {
      var shell = util.shell();
      expect(shell.cwd).to.equal('/');
    });

    it('should allow changing the path to a valid dir', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        expect(shell.cwd).to.equal('/');
        shell.cd('/dir', function(err) {
          expect(err).not.to.exist;
          expect(shell.cwd).to.equal('/dir');
          done();
        });
      });
    });

    it('should fail when changing the path to an invalid dir', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        expect(shell.cwd).to.equal('/');
        shell.cd('/nodir', function(err) {
          expect(err).to.exist;
          expect(err.name).to.equal('ENotDirectory');
          expect(shell.cwd).to.equal('/');
          done();
        });
      });
    });

    it('should fail when changing the path to a file', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.writeFile('/file', 'file', function(err) {
        if(err) throw err;

        expect(shell.cwd).to.equal('/');
        shell.cd('/file', function(err) {
          expect(err).to.exist;
          expect(err.name).to.equal('ENotDirectory');
          expect(shell.cwd).to.equal('/');
          done();
        });
      });
    });

    it('should allow relative paths for a valid dir', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        expect(shell.cwd).to.equal('/');
        shell.cd('./dir', function(err) {
          expect(err).not.to.exist;
          expect(shell.cwd).to.equal('/dir');
          done();
        });
      });
    });

    it('should allow .. in paths for a valid dir', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        expect(shell.cwd).to.equal('/');
        shell.cd('./dir', function(err) {
          expect(err).not.to.exist;
          expect(shell.cwd).to.equal('/dir');
          shell.cd('..', function(err) {
            expect(err).not.to.exist;
            expect(shell.cwd).to.equal('/');
            done();
          });
        });
      });
    });

  });
});
