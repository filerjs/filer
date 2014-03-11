define(["Filer", "util"], function(Filer, util) {
  
  describe('FileSystemShell.mv'), function() {
  	beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.mv).to.be.a('function');
    });


  });
});