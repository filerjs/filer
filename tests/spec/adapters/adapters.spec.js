define(["Filer"], function(Filer) {
  describe("Filer.FileSystem.adapters", function() {
    it("is defined", function() {
      expect(typeof Filer.FileSystem.adapters).not.toEqual(undefined);
    });

    it("has an AES constructor", function() {
      expect(typeof Filer.FileSystem.adapters.AES).toEqual('function');
    });

    it("has a TripleDES constructor", function() {
      expect(typeof Filer.FileSystem.adapters.TripleDES).toEqual('function');
    });

    it("has a Rabbit constructor", function() {
      expect(typeof Filer.FileSystem.adapters.Rabbit).toEqual('function');
    });

    it("has a default Encryption constructor", function() {
      expect(typeof Filer.FileSystem.adapters.Encryption).toEqual('function');
    });

    it("has a Zlib constructor", function() {
      expect(typeof Filer.FileSystem.adapters.Zlib).toEqual('function');
    });

    it("has a default Compression constructor", function() {
      expect(typeof Filer.FileSystem.adapters.Compression).toEqual('function');
    });
  });
});
