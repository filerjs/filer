define(["Filer"], function(Filer) {

  describe('fs.symlink', function() {
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
      expect(typeof this.fs.symlink).toEqual('function');
    });

    it('should return an error if part of the parent destination path does not exist', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.symlink('/', '/tmp/mydir', function(error) {
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

    it('should return an error if the destination path already exists', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.symlink('/tmp', '/', function(error) {
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

    it('should create a symlink', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.symlink('/', '/myfile', function(error, result) {
        _error = error;
        _result = result;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).not.toBeDefined();
       });
    });
  });

});