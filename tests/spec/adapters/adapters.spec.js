define(["Filer"], function(Filer) {
  describe("Filer.FileSystem.adapters", function() {
    it("is defined", function() {
      expect(Filer.FileSystem.adapters).to.exist;
    });

    it("has a default Encryption constructor", function() {
      expect(Filer.FileSystem.adapters.Encryption).to.be.a('function');
    });

    it("has a default Compression constructor", function() {
      expect(Filer.FileSystem.adapters.Compression).to.be.a('function');
    });
  });
});
