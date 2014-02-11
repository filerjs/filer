define(["Filer"], function(Filer) {

  describe('fs.writeFile truncation - issue 106', function() {
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

    it('should truncate an existing file', function() {
      var fs = this.fs;
      var filename = '/test';
      var _complete = false;
      var _size1, _size2;

      fs.writeFile(filename, '1', function(err) {
        if(err) throw err;

        fs.stat(filename, function(err, stats) {
          if(err) throw err;
          _size1 = stats.size;

          fs.writeFile(filename, '', function(err) {
            if(err) throw err;

            fs.stat(filename, function(err, stats) {
              if(err) throw err;
              _size2 = stats.size;

              _complete = true;
            });
          });
        });
      });

      waitsFor(function() {
        return _complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_size1).toEqual(1);
        expect(_size2).toEqual(0);
      });
    });
  });
});
