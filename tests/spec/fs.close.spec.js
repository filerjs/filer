define(["Filer"], function(Filer) {

  describe('fs.close', function() {
    beforeEach(function() {
      this.db_name = mk_db_name();
      this.fs = new Filer.FileSystem({
        name: this.db_name,
        flags: 'FORMAT'
      });
    });

    afterEach(function() {
      indexedDB.deleteDatabase(this.db_name);
      delete this.fs;
    });

    it('should be a function', function() {
      expect(typeof this.fs.close).toEqual('function');
    });

    it('should release the file descriptor', function() {
      var complete = false;
      var _error;
      var that = this;

      var buffer = new Uint8Array(0);

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.close(fd, function(error) {
          that.fs.read(fd, buffer, 0, buffer.length, undefined, function(error, result) {
            _error = error;
            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });
  });

});