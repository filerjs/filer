define(["Filer"], function(Filer) {

  describe('fs.write', function() {
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
      expect(typeof this.fs.write).toEqual('function');
    });

    it('should write data to a file', function() {
      var complete = false;
      var _error, _result, _stats;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
          _error = error;
          _result = result;

          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _stats = result;

            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(buffer.length);
        expect(_stats.size).toEqual(buffer.length);
      });
    });

    it('should update the current file position', function() {
      var complete = false;
      var _error, _result, _stats;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      _result = 0;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;
          _result += result;

          that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
            if(error) throw error;
            _result += result;

            that.fs.stat('/myfile', function(error, result) {
              if(error) throw error;

              _stats = result;

              complete = true;
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(2 * buffer.length);
        expect(_stats.size).toEqual(_result);
      });
    });
  });

});
