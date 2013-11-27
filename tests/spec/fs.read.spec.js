define(["IDBFS"], function(IDBFS) {

  describe('fs.read', function() {
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

    it('should be a function', function() {
      expect(typeof this.fs.read).toEqual('function');
    });

    it('should read data from a file', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var wbuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var rbuffer = new Uint8Array(wbuffer.length);

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.read(fd, rbuffer, 0, rbuffer.length, 0, function(error, result) {
            _error = error;
            _result = result;

            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(rbuffer.length);
        expect(typed_array_equal(wbuffer, rbuffer)).toEqual(true);
      });
    });

    it('should update the current file position', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var wbuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var rbuffer = new Uint8Array(wbuffer.length);
      _result = 0;

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, wbuffer, 0, wbuffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.read(fd, rbuffer, 0, rbuffer.length / 2, undefined, function(error, result) {
            if(error) throw error;

            _result += result;
            that.fs.read(fd, rbuffer, rbuffer.length / 2, rbuffer.length, undefined, function(error, result) {
              if(error) throw error;

              _result += result;
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
        expect(_result).toEqual(rbuffer.length);
        expect(typed_array_equal(wbuffer.buffer, rbuffer.buffer)).toEqual(true);
      });
    });
  });

});