define(["IDBFS"], function(IDBFS) {

  describe('fs.truncate', function() {
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
      expect(typeof this.fs.truncate).toEqual('function');
    });

    it('should error when length is negative', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";

      that.fs.writeFile('/myfile', contents, function(error) {
        if(error) throw error;

        that.fs.truncate('/myfile', -1, function(error) {
          _error = error;
          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });

    it('should error when path is not a file', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.truncate('/', 0, function(error) {
        _error = error;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });

    it('should truncate a file', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var truncated = new Uint8Array([1]);

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.close(fd, function(error) {
            if(error) throw error;

            that.fs.truncate('/myfile', 1, function(error) {
              _error = error;

              that.fs.readFile('/myfile', function(error, result) {
                if(error) throw error;

                _result = result;
                complete = true;
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
        expect(_result).toEqual(truncated);
      });
    });

    it('should pad a file with zeros when the length is greater than the file size', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      var truncated = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 0]);

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.close(fd, function(error) {
            if(error) throw error;

            that.fs.truncate('/myfile', 9, function(error) {
              _error = error;

              that.fs.readFile('/myfile', function(error, result) {
                if(error) throw error;

                _result = result;
                complete = true;
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
        expect(_result).toEqual(truncated);
      });
    });

    it('should update the file size', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.close(fd, function(error) {
            if(error) throw error;

            that.fs.truncate('/myfile', 0, function(error) {
              _error = error;

              that.fs.stat('/myfile', function(error, result) {
                if(error) throw error;

                _result = result;
                complete = true;
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
        expect(_result.size).toEqual(0);
      });
    });

    it('should truncate a valid descriptor', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.ftruncate(fd, 0, function(error) {
            _error = error;

            that.fs.fstat(fd, function(error, result) {
              if(error) throw error;

              _result = result;
              complete=true;
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result.size).toEqual(0);
      });
    });

    it('should follow symbolic links', function() {
      var complete = false;
      var _error, _result, _result2;
      var that = this;

      var buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.write(fd, buffer, 0, buffer.length, 0, function(error, result) {
          if(error) throw error;

          that.fs.close(fd, function(error) {
            if(error) throw error;

            that.fs.symlink('/myfile', '/mylink', function(error) {
              if(error) throw error;

              that.fs.truncate('/mylink', 0, function(error) {
                _error = error;

                that.fs.stat('/myfile', function(error, result) {
                  if(error) throw error;

                  _result = result;
                  that.fs.lstat('/mylink', function(error, result) {
                    if(error) throw error;

                    _result2 = result;
                    complete=true;
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
        expect(_result.size).toEqual(0);
        expect(_result2.size).not.toEqual(0);
      });
    });
  });
});