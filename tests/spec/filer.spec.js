define(["Filer"], function(Filer) {

  describe("Filer", function() {
    it("is defined", function() {
      expect(typeof Filer).not.toEqual(undefined);
    });

    it("has FileSystem constructor", function() {
      expect(typeof Filer.FileSystem).toEqual('function');
    });
  });

});