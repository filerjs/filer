define(["Filer"], function(Filer) {

  describe('fs.open', function() {
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
      expect(typeof this.fs.open).toEqual('function');
    });

    it('should return an error if the parent path does not exist', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.open('/tmp/myfile', 'w+', function(error, result) {
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

    it('should return an error when flagged for read and the path does not exist', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.open('/myfile', 'r+', function(error, result) {
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


    it('should return an error when flagged for write and the path is a directory', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        if(error) throw error;
        that.fs.open('/tmp', 'w', function(error, result) {
          _error = error;
          _result = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_result).not.toBeDefined();
      });
    });

    it('should return an error when flagged for append and the path is a directory', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        if(error) throw error;
        that.fs.open('/tmp', 'a', function(error, result) {
          _error = error;
          _result = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_result).not.toBeDefined();
      });
    });

    it('should return a unique file descriptor', function() {
      var complete1 = false;
      var complete2 = false;
      var _error, _result1, _result2;
      var that = this;

      that.fs.open('/file1', 'w+', function(error, fd) {
        if(error) throw error;
        _error = error;
        _result1 = fd;

        complete1 = true;
      });
      that.fs.open('/file2', 'w+', function(error, fd) {
        if(error) throw error;
        _error = error;
        _result2 = fd;

        complete2 = true;
      });

      waitsFor(function() {
        return complete1 && complete2;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result1).toBeDefined();
        expect(_result2).toBeDefined();
        expect(_result1).not.toEqual(_result2);
      });
    });

    it('should create a new file when flagged for write', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;
        that.fs.stat('/myfile', function(error, result) {
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