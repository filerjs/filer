define(["Filer"], function(Filer) {
  describe("Filer.FileSystem.adapters", function() {
    it("is defined", function() {
      expect(typeof Filer.FileSystem.adapters).not.toEqual(undefined);
    });

    it("has a default Encryption constructor", function() {
      expect(typeof Filer.FileSystem.adapters.Encryption).toEqual('function');
    });

    it("has a default Compression constructor", function() {
      expect(typeof Filer.FileSystem.adapters.Compression).toEqual('function');
    });
  });
});
