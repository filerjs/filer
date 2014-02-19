define(["Filer", "util"], function(Filer, util) {

  describe('FileSystemShell.env', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should get default env options', function() {
      var shell = util.shell();
      expect(shell.env).to.exist;
      expect(shell.env.TMP).to.equal('/tmp');
      expect(shell.env.PATH).to.equal('');
      expect(shell.env.PWD).to.equal('/');
    });

    it('should be able to specify env options', function() {
      var options = {
        env: {
          TMP: '/tempdir',
          PATH: '/dir'
        }
      };
      var shell = util.shell(options);
      expect(shell.env).to.exist;
      expect(shell.env.TMP).to.equal('/tempdir');
      expect(shell.env.PATH).to.equal('/dir');
      expect(shell.env.PWD).to.equal('/');
    });

    it('should fail when dirs argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.cat(null, function(error, list) {
        expect(error).to.exist;
        expect(list).not.to.exist;
        done();
      });
    });

    it('should update the value of env.PWD when cwd changes', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(err) {
        if(err) throw err;

        expect(shell.cwd).to.equal('/');
        expect(shell.env.PWD).to.equal('/');

        shell.cd('/dir', function(err) {
          expect(err).not.to.exist;
          expect(shell.cwd).to.equal('/dir');
          expect(shell.env.PWD).to.equal('/dir');
          done();
        });
      });
    });

    it('should create/return the default tmp dir', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      expect(shell.env.TMP).to.equal('/tmp');
      shell.tempDir(function(err, tmp) {
        expect(err).not.to.exist;
        shell.cd(tmp, function(err) {
          expect(err).not.to.exist;
          expect(shell.cwd).to.equal('/tmp');
          expect(shell.env.PWD).to.equal('/tmp');
          done();
        });
      });
    });

    it('should create/return the tmp dir specified in env.TMP', function(done) {
      var fs = util.fs();
      var shell = fs.Shell({
        env: {
          TMP: '/tempdir'
        }
      });

      expect(shell.env.TMP).to.equal('/tempdir');
      shell.tempDir(function(err, tmp) {
        expect(err).not.to.exist;
        shell.cd(tmp, function(err) {
          expect(err).not.to.exist;
          expect(shell.cwd).to.equal('/tempdir');
          expect(shell.env.PWD).to.equal('/tempdir');
          done();
        });
      });
    });

    it('should allow repeated calls to tempDir()', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      expect(shell.env.TMP).to.equal('/tmp');
      shell.tempDir(function(err, tmp) {
        expect(err).not.to.exist;
        expect(tmp).to.equal('/tmp');

        shell.tempDir(function(err, tmp) {
          expect(err).not.to.exist;
          expect(tmp).to.equal('/tmp');
          done();
        });
      });
    });

  });
});
