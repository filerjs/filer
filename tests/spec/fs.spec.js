define(["IDBFS"], function(IDBFS) {

  describe("fs", function() {
    beforeEach(function() {
      this.db_name = mk_db_name();
      this.fs = new IDBFS.FileSystem({
        name: this.db_name,
        flags: 'FORMAT'
      });
    });

    afterEach(function() {
      indexedDB.deleteDatabase(this.db_name);
      delete this.fs;
    });

    it("is an object", function() {
      expect(typeof this.fs).toEqual('object');
    });

    it('should have a root directory', function() {
      var complete = false;
      var _result;

      this.fs.stat('/', function(error, result) {
        _result = result;

        complete = true;
    });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
      });
    });
  });

});
