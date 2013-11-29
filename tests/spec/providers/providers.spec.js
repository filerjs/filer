define(["IDBFS"], function(IDBFS) {
  describe("IDBFS.Providers", function() {
    it("is defined", function() {
      expect(typeof IDBFS.FileSystem.providers).not.toEqual(undefined);
    });

    it("has IndexedDB constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.IndexedDB).toEqual('function');
    });

    it("has WebSQL constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.WebSQL).toEqual('function');
    });

    it("has Memory constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.Memory).toEqual('function');
    });

    it("has an AESWrapper constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.AESWrapper).toEqual('function');
    });

    it("has a TripleDESWrapper constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.TripleDESWrapper).toEqual('function');
    });

    it("has a RabbitWrapper constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.RabbitWrapper).toEqual('function');
    });

    it("has a Default constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.Default).toEqual('function');
    });

    it("has Fallback constructor", function() {
      expect(typeof IDBFS.FileSystem.providers.Fallback).toEqual('function');
    });
  });
});
