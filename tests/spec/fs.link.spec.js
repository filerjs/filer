define(["Filer"], function(Filer) {

  describe('fs.link', function() {
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
      expect(typeof this.fs.link).toEqual('function');
    });

    it('should create a link to an existing file', function() {
      var complete = false;
      var _error, _oldstats, _newstats;
      var that = this;

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;

          that.fs.link('/myfile', '/myotherfile', function(error) {
            if(error) throw error;

            that.fs.stat('/myfile', function(error, result) {
              if(error) throw error;

              _oldstats = result;
              that.fs.stat('/myotherfile', function(error, result) {
                if(error) throw error;

                _newstats = result;

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
        expect(_newstats.node).toEqual(_oldstats.node);
        expect(_newstats.nlinks).toEqual(2);
        expect(_newstats).toEqual(_oldstats);
      });
    });

    it('should not follow symbolic links', function () {
      var complete = false;
      var _error, _oldstats, _linkstats, _newstats;
      var that = this;

      that.fs.stat('/', function (error, result) {
        if (error) throw error;
        _oldstats = result;
        that.fs.symlink('/', '/myfileLink', function (error) {
          if (error) throw error;
          that.fs.link('/myfileLink', '/myotherfile', function (error) {
            if (error) throw error;
            that.fs.lstat('/myfileLink', function (error, result) {
              if (error) throw error;
              _linkstats = result;
              that.fs.lstat('/myotherfile', function (error, result) {
                if (error) throw error;
                _newstats = result;
                complete = true;
              });
            });
          });
        });
      });

     waitsFor(function () {
       return complete;
     }, 'test to complete', DEFAULT_TIMEOUT);

     runs(function () {
       expect(_error).toEqual(null);
       expect(_newstats.node).toEqual(_linkstats.node);
       expect(_newstats.node).toNotEqual(_oldstats.node);
       expect(_newstats.nlinks).toEqual(2);
       expect(_newstats).toEqual(_linkstats);
     });
    });
  });

});