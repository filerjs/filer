define(["Filer", "util"], function(Filer, util) {

  describe('fs.watch', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      expect(typeof fs.watch).to.equal('function');
    });

    it('should get a change event when writing a file', function(done) {
      var fs = util.fs();

      var watcher = fs.watch('/myfile', function(event, filename) {
        expect(event).to.equal('change');
        expect(filename).to.equal('/myfile');
        watcher.close();
        done();
      });

      fs.writeFile('/myfile', 'data', function(error) {
        if(error) throw error;
      });
    });

    it('should get a change event when writing a file in a dir with recursive=true', function(done) {
      var fs = util.fs();

      var watcher = fs.watch('/', { recursive: true }, function(event, filename) {
        expect(event).to.equal('change');
        expect(filename).to.equal('/');
        watcher.close();
        done();
      });

      fs.writeFile('/myfile', 'data', function(error) {
        if(error) throw error;
      });
    });

    it('should get a change event when a file hardlink is being watched and the original file is changed', function(done) {
      var fs = util.fs();

      fs.writeFile('/myfile', 'data', function(error) {
        if(error) throw error;

        fs.link('/myfile', '/hardlink', function(error) {
          if(error) throw error;

          var watcher = fs.watch('/hardlink', function(event, filename) {
            expect(event).to.equal('change');
            expect(filename).to.equal('/hardlink');
            watcher.close();
            done();
          });

          fs.appendFile('/myfile', '...more data', function(error) {
            if(error) throw error;

            fs.readFile('/hardlink', 'utf8', function(error, data) {
              if(error) throw error;

              expect(data).to.equal('data...more data')
            });
          });
        });
      });
    });
  });

});
