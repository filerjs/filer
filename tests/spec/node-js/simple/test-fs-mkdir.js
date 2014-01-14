define(["Filer"], function(Filer) {

  describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js", function() {

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

    // Based on test1 from https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js
    it('should create a dir without a mode arg', function() {
      var _error, _result;
      var complete = false;
      var pathname = '/test1';
      var fs = this.fs;

      fs.mkdir(pathname, function(err) {
        _error = err;
        fs.stat(pathname, function(err, result) {
          _error = _error || err;
          _result = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_error).toEqual(null);
      });
    });

    // Based on test2 https://github.com/joyent/node/blob/master/test/simple/test-fs-mkdir.js
    it('should create a dir with a mode arg', function() {
      var _error, _result;
      var complete = false;
      var pathname = '/test2';
      var fs = this.fs;

      fs.mkdir(pathname, 511 /*=0777*/, function(err) {
        _error = err;
        fs.stat(pathname, function(err, result) {
          _error = _error || err;
          _result = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_error).toEqual(null);
      });
    });

  });

});
