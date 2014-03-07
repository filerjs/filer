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

      fs.watch('/myfile', function(filename) {
        expect(filename).to.equal('/myfile');
        done();
      });

      fs.writeFile('/myfile', 'data', function(error) {
        if(error) throw error;
      });
    });

    it('should get a change event when writing a file in a dir with recursive=true', function(done) {
      var fs = util.fs();

      fs.watch('/', { recursive: true }, function(filename) {
        expect(filename).to.equal('/');
        done();
      });

      fs.writeFile('/myfile', 'data', function(error) {
        if(error) throw error;
      });
    });
  });

});
