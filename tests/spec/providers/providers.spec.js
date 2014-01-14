define(["Filer"], function(Filer) {
  describe("Filer.FileSystem.providers", function() {
    it("is defined", function() {
      expect(typeof Filer.FileSystem.providers).not.toEqual(undefined);
    });

    it("has IndexedDB constructor", function() {
      expect(typeof Filer.FileSystem.providers.IndexedDB).toEqual('function');
    });

    it("has WebSQL constructor", function() {
      expect(typeof Filer.FileSystem.providers.WebSQL).toEqual('function');
    });

    it("has Memory constructor", function() {
      expect(typeof Filer.FileSystem.providers.Memory).toEqual('function');
    });

    it("has a Default constructor", function() {
      expect(typeof Filer.FileSystem.providers.Default).toEqual('function');
    });

    it("has Fallback constructor", function() {
      expect(typeof Filer.FileSystem.providers.Fallback).toEqual('function');
    });
  });
});
