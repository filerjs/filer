define(["Filer"], function(Filer) {

 describe('fs.mkdir', function() {
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
      expect(typeof this.fs.mkdir).toEqual('function');
    });

    it('should return an error if part of the parent path does not exist', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.mkdir('/tmp/mydir', function(error) {
        _error = error;

        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'stat to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });

    it('should return an error if the path already exists', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.mkdir('/', function(error) {
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

    it('should make a new directory', function() {
      var complete = false;
      var _error, _result, _stat;
      var that = this;

      that.fs.mkdir('/tmp', function(error, result) {
        _error = error;
        _result = result;

        that.fs.stat('/tmp', function(error, result) {
          _stat = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).not.toBeDefined();
        expect(_stat).toBeDefined();
      });
    });
  });

});