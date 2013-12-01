define(["IDBFS"], function(IDBFS) {
  describe("IDBFS.FileSystem.adapters", function() {
    it("is defined", function() {
      expect(typeof IDBFS.FileSystem.adapters).not.toEqual(undefined);
    });

    it("has an AES constructor", function() {
      expect(typeof IDBFS.FileSystem.adapters.AES).toEqual('function');
    });

    it("has a TripleDES constructor", function() {
      expect(typeof IDBFS.FileSystem.adapters.TripleDES).toEqual('function');
    });

    it("has a Rabbit constructor", function() {
      expect(typeof IDBFS.FileSystem.adapters.Rabbit).toEqual('function');
    });

    it("has a default Encryption constructor", function() {
      expect(typeof IDBFS.FileSystem.adapters.Encryption).toEqual('function');
    });
  });
});
