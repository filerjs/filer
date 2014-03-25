define(["Filer", "util"], function(Filer, util) {

  describe('FileSystemShell.unzip', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.unzip).to.be.a('function');
    });

    it('should fail when path argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.unzip(null, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should download and unzip the contents of a zip file', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var url = "test-file.txt.zip";
      var contents = "This is a test file used in some of the tests.\n";

      fs.writeFile('/original', contents, function(err) {
        if(err) throw err;

        shell.wget(url, {filename: url}, function(err, path) {
          if(err) throw err;

          shell.unzip(path, function(err) {
            if(err) throw err;

            fs.readFile('/original', function(err, originalData) {
              if(err) throw err;


              fs.readFile('/test-file.txt', function(err, data) {
                if(err) throw err;
                expect(util.typedArrayEqual(data, originalData)).to.be.true;
                done();
              });
            });
          });
        });
      });
    });

  });
});
