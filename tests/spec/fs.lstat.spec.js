define(["IDBFS"], function(IDBFS) {

 describe('fs.lstat', function() {
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
      expect(typeof this.fs.lstat).toEqual('function');
    });

    it('should return an error if path does not exist', function() {
      var complete = false;
      var _error, _result;

      this.fs.lstat('/tmp', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_result).not.toBeDefined();
      });
    });

    it('should return a stat object if path is not a symbolic link', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.lstat('/', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toBeDefined();
      });
    });


    it('should return a stat object if path is a symbolic link', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.symlink('/', '/mylink', function(error) {
        if(error) throw error;

        that.fs.lstat('/mylink', function(error, result) {
          _error = error;
          _result = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toBeDefined();
      });
    });
  });

});