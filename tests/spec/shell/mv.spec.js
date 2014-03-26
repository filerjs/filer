define(["Filer", "util"], function(Filer, util) {
  
  describe('FileSystemShell.mv', function() {
  	beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.mv).to.be.a('function');
    });

    it('should fail when source argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.mv(null, null, function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should fail when destination argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
      	if(error) throw error;

        shell.mv('/file', null, function(error) {
          expect(error).to.exist;
          done();
        });
      });
    });

    it('should fail when source argument does not exist', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(error) {
        expect(error).not.to.exist;
      });

      shell.mv('/file', '/dir', function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should fail when root is provided as source argument', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(error) {
        expect(error).not.to.exist;
      });

      shell.mv('/', '/dir', function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should rename a file which is moved to the same directory under a different name', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
        expect(error).not.to.exist;

        shell.mv('/file', '/newfile', function(error) {
          expect(error).not.to.exist;
          fs.stat('/file', function(error, stats) {
            expect(error).to.exist;
            expect(stats).not.to.exist;
            fs.stat('/newfile', function(error,stats) {
              expect(error).not.to.exist;
              expect(stats).to.exist;
              done();
            });
          });
        });
      });
    });

    it('should move a file to a directory which does not currently exist', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
      	expect(error).not.to.exist;

        shell.mv('/file', '/dir/newfile', function(error) {
          expect(error).not.to.exist;
          fs.stat('/file', function(error, stats) {
            expect(error).to.exist;
            expect(stats).not.to.exist;
            fs.stat('/dir/newfile', function(error, stats) {
              expect(error).not.to.exist;
              expect(stats).to.exist;
              done();
            });
          });
        });
      });
    });

    it('should move a file into an empty directory', function(done) {
      done();
    });

    it('should move a file into a directory that has a file of the same name', function(done) {
      done();
    });

    it('should move a directory to a destination that does not currently exist', function(done) {
      done();
    });

    
  });
});
