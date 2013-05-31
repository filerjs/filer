var TEST_DATABASE_NAME = 'test';

describe("file system", function() {
    beforeEach(function() {
      this.fs = new IDBFS.FileSystem(TEST_DATABASE_NAME, 'FORMAT');
    });

    afterEach(function() {
      indexedDB.deleteDatabase(TEST_DATABASE_NAME);
    });

    it("is created", function() {
      expect(typeof this.fs).toEqual('object');
    });
});