define(["Filer"], function(Filer) {

  describe('fs.lseek', function() {
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
      expect(typeof this.fs.lseek).toEqual('function');
    });

    it('should not follow symbolic links', function () {
      var complete = false;
      var _error, _stats;
      var that = this;

      that.fs.open('/myfile', 'w', function (error, result) {
        if (error) throw error;

        var fd = result;
        that.fs.close(fd, function (error) {
          if (error) throw error;

          that.fs.symlink('/myfile', '/myFileLink', function (error) {
            if (error) throw error;

            that.fs.rename('/myFileLink', '/myOtherFileLink', function (error) {
              if (error) throw error;

              that.fs.stat('/myfile', function (error, result) {
                _error1 = error;

                that.fs.lstat('/myFileLink', function (error, result) {
                  _error2 = error;

                  that.fs.stat('/myOtherFileLink', function (error, result) {
                    if (error) throw error;

                    _stats = result;
                    complete = true;
                  });
                });
              });
            });
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error1).toEqual(null);
        expect(_error2).toBeDefined();
        expect(_stats.nlinks).toEqual(1);
      });
    });

    it('should set the current position if whence is SET', function() {
      var complete = false;
      var _error, _result, _stats;
      var that = this;

      var offset = 3;
      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var result_buffer = new Uint8Array(buffer.length + offset);

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;

          that.fs.lseek(fd, offset, 'SET', function(error, result) {
            _error = error;
            _result = result;

            that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
              if(error) throw error;

              that.fs.read(fd, result_buffer, 0, result_buffer.length, 0, function(error, result) {
                if(error) throw error;

                that.fs.stat('/myfile', function(error, result) {
                  if(error) throw error;

                  _stats = result;

                  complete = true;
                });
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(offset);
        expect(_stats.size).toEqual(offset + buffer.length);
        var expected = new Uint8Array([1, 2, 3, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(typed_array_equal(result_buffer, expected)).toEqual(true);
      });
    });

    it('should update the current position if whence is CUR', function() {
      var complete = false;
      var _error, _result, _stats;
      var that = this;

      var offset = -2;
      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var result_buffer = new Uint8Array(2 * buffer.length + offset);

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;

          that.fs.lseek(fd, offset, 'CUR', function(error, result) {
            _error = error;
            _result = result;

            that.fs.write(fd, buffer, 0, buffer.length, undefined, function(error, result) {
              if(error) throw error;

              that.fs.read(fd, result_buffer, 0, result_buffer.length, 0, function(error, result) {
                if(error) throw error;

                that.fs.stat('/myfile', function(error, result) {
                  if(error) throw error;

                  _stats = result;

                  complete = true;
                });
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(offset + buffer.length);
        expect(_stats.size).toEqual(offset + 2 * buffer.length);
        var expected = new Uint8Array([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(typed_array_equal(result_buffer, expected)).toEqual(true);
      });
    });

    it('should update the current position if whence is END', function() {
      var complete = false;
      var _error, _result, _stats;
      var that = this;

      var offset = 5;
      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var result_buffer;

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd1 = result;
        that.fs.write(fd1, buffer, 0, buffer.length, undefined, function(error, result) {
          if(error) throw error;

          that.fs.open('/myfile', 'w+', function(error, result) {
            if(error) throw error;

            var fd2 = result;
            that.fs.lseek(fd2, offset, 'END', function(error, result) {
              _error = error;
              _result = result;

              that.fs.write(fd2, buffer, 0, buffer.length, undefined, function(error, result) {
                if(error) throw error;

                that.fs.stat('/myfile', function(error, result) {
                  if(error) throw error;

                  _stats = result;
                  result_buffer = new Uint8Array(_stats.size);
                  that.fs.read(fd2, result_buffer, 0, result_buffer.length, 0, function(error, result) {
                    if(error) throw error;

                    complete = true;
                  });
                });
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(offset + buffer.length);
        expect(_stats.size).toEqual(offset + 2 * buffer.length);
        var expected = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(typed_array_equal(result_buffer, expected)).toEqual(true);
      });
    });
  });

});