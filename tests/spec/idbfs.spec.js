define(["IDBFS"], function(IDBFS) {

  describe("IDBFS", function() {
    it("is defined", function() {
      expect(typeof IDBFS).not.toEqual(undefined);
    });

    it("has FileSystem constructor", function() {
      expect(typeof IDBFS.FileSystem).toEqual('function');
    });
  });

});