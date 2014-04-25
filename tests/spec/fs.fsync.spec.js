define(["Filer", "util"], function(Filer, util) {

  describe('fs.fsync', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var fs = util.fs();
      expect(fs.fsync).to.be.a('function');
    });

    it('should return error when fd is invalid', function() {
      var fs = util.fs();
      fs.fsync(1, function(error){
      	expect(error).to.exist;
      });
    });

    it('should not error if the fd is valid', function(done) {
      var fs = util.fs();
      fs.writeFile('/myfile', 'the contents', function(error) {
        if(error) throw error;
        fs.open('/myfile', 'r', function(error, fd) {
          if(error) throw error;
          fs.fsync(fd, function(error) {
            expect(error).to.not.exist;
            done();
          });
        });
      });
    });
  });
});