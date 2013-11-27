define(["IDBFS"], function(IDBFS) {

  describe('fs.unlink', function() {
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
      expect(typeof this.fs.unlink).toEqual('function');
    });

    it('should remove a link to an existing file', function() {
      var complete1 = false;
      var complete2 = false;
      var _error, _stats;
      var that = this;

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;

          that.fs.link('/myfile', '/myotherfile', function(error) {
            if(error) throw error;

            that.fs.unlink('/myfile', function(error) {
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
      });

      waitsFor(function() {
        return complete1 && complete2;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_stats.nlinks).toEqual(1);
      });
    });

    it('should not follow symbolic links', function () {
      var complete = false;
      var _error, _stats1, _stats2;
      var that = this;

      that.fs.symlink('/', '/myFileLink', function (error) {
        if (error) throw error;

        that.fs.link('/myFileLink', '/myotherfile', function (error) {
          if (error) throw error;

          that.fs.unlink('/myFileLink', function (error) {
            if (error) throw error;

            that.fs.lstat('/myFileLink', function (error, result) {
              _error = error;

              that.fs.lstat('/myotherfile', function (error, result) {
                if (error) throw error;
                _stats1 = result;

                that.fs.stat('/', function (error, result) {
                  if (error) throw error;
                  _stats2 = result;
                  complete = true;
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
        expect(_error).toBeDefined();
        expect(_stats1.nlinks).toEqual(1);
        expect(_stats2.nlinks).toEqual(1);
      });
    });
  });

});
