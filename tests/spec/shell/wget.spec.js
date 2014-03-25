define(["Filer", "util"], function(Filer, util) {

  describe('FileSystemShell.wget', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.wget).to.be.a('function');
    });

    it('should fail when url argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.wget(null, function(err, data) {
        expect(err).to.exist;
        expect(data).not.to.exist;
        done();
      });
    });

    it('should download the contents of a file from a url to default filename', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var url = "test-file.txt";
      var contents = "This is a test file used in some of the tests.\n";

      shell.wget(url, function(err, path) {
        if(err) throw err;

        // The filename should be something like /file-13424512341
        expect(path).to.match(/^\/file\-\d+$/);

        fs.readFile(path, 'utf8', function(err, data) {
          if(err) throw err;

          expect(data).to.equal(contents);
          done();
        });
      });
    });

    it('should download the contents of a file from a url to specified filename', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var url = "test-file.txt";
      var contents = "This is a test file used in some of the tests.\n";

      shell.wget(url, { filename: 'test-file.txt' }, function(err, path) {
        if(err) throw err;

        // The filename should be something like /file-13424512341
        expect(path).to.equal('/test-file.txt');

        fs.readFile(path, 'utf8', function(err, data) {
          if(err) throw err;

          expect(data).to.equal(contents);
          done();
        });
      });
    });

  });
});
