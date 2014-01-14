define(["Filer"], function(Filer) {

 describe('fs.rmdir', function() {
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
      expect(typeof this.fs.rmdir).toEqual('function');
    });

    it('should return an error if the path does not exist', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.rmdir('/tmp/mydir', function(error) {
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

    it('should return an error if attempting to remove the root directory', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.rmdir('/', function(error) {
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

    it('should return an error if the directory is not empty', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        that.fs.mkdir('/tmp/mydir', function(error) {
          that.fs.rmdir('/', function(error) {
            _error = error;

            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });

    it('should return an error if the path is not a directory', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        that.fs.open('/tmp/myfile', 'w', function(error, fd) {
          that.fs.close(fd, function(error) {
            that.fs.rmdir('/tmp/myfile', function(error) {
              _error = error;

              complete = true;
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
      });
    });

    it('should return an error if the path is a symbolic link', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.mkdir('/tmp', function (error) {
        that.fs.symlink('/tmp', '/tmp/myfile', function (error) {
          that.fs.rmdir('/tmp/myfile', function (error) {
            _error = error;

            complete = true;
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
      });
    });

    it('should remove an existing directory', function() {
      var complete = false;
      var _error, _stat;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        that.fs.rmdir('/tmp', function(error) {
          _error = error;
          that.fs.stat('/tmp', function(error, result) {
            _stat = result;

            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_stat).not.toBeDefined();
      });
    });
  });

});
