define(["Filer"], function(Filer) {

  describe('fs.rename', function() {
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
      expect(typeof this.fs.rename).toEqual('function');
    });

    it('should rename an existing file', function() {
      var complete1 = false;
      var complete2 = false;
      var _error, _stats;
      var that = this;

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;

          that.fs.rename('/myfile', '/myotherfile', function(error) {
            if(error) throw error;

            that.fs.stat('/myfile', function(error, result) {
              _error = error;
              complete1 = true;
            });

            that.fs.stat('/myotherfile', function(error, result) {
              if(error) throw error;

              _stats = result;
              complete2 = true;
            });
          });
        });
      });

      waitsFor(function() {
        return complete1 && complete2;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_stats.nlinks).toEqual(1);
      });
    });
  });

});
