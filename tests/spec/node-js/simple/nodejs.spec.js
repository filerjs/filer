define(["Filer", "util"], function(Filer, util) {

  describe('Nodejs compatability', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('module should be requireable', function() {
      expect(function() {
        var Filer = require('../../dist/filer_node.js');
      }).to.not.throwError;
    });
  });
});
