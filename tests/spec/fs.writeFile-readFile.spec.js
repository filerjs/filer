define(["IDBFS"], function(IDBFS) {

  describe('fs.writeFile, fs.readFile', function() {
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
      expect(typeof this.fs.writeFile).toEqual('function');
      expect(typeof this.fs.readFile).toEqual('function');
    });

    it('should error when path is wrong to readFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";

      that.fs.readFile('/no-such-file', 'utf8', function(error, data) {
        _error = error;
        _result = data;
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

    it('should write, read a utf8 file without specifying utf8 in writeFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";

      that.fs.writeFile('/myfile', contents, function(error) {
        if(error) throw error;
        that.fs.readFile('/myfile', 'utf8', function(error2, data) {
          if(error2) throw error2;
          _result = data;
          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(contents);
      });
    });

    it('should write, read a utf8 file with "utf8" option to writeFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";

      that.fs.writeFile('/myfile', contents, 'utf8', function(error) {
        if(error) throw error;
        that.fs.readFile('/myfile', 'utf8', function(error2, data) {
          if(error2) throw error2;
          _result = data;
          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(contents);
      });
    });

    it('should write, read a utf8 file with {encoding: "utf8"} option to writeFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";

      that.fs.writeFile('/myfile', contents, { encoding: 'utf8' }, function(error) {
        if(error) throw error;
        that.fs.readFile('/myfile', 'utf8', function(error2, data) {
          if(error2) throw error2;
          _result = data;
          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(contents);
      });
    });

    it('should write, read a binary file', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      // String and utf8 binary encoded versions of the same thing:
      var contents = "This is a file.";
      var binary = new Uint8Array([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);

      that.fs.writeFile('/myfile', binary, function(error) {
        if(error) throw error;
        that.fs.readFile('/myfile', function(error2, data) {
          if(error2) throw error2;
          _result = data;
          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(binary);
      });
    });

    it('should follow symbolic links', function () {
      var complete = false;
      var _result;
      var that = this;

      var contents = "This is a file.";

      that.fs.writeFile('/myfile', '', { encoding: 'utf8' }, function(error) {
        if(error) throw error;
        that.fs.symlink('/myfile', '/myFileLink', function (error) {
          if (error) throw error;
          that.fs.writeFile('/myFileLink', contents, 'utf8', function (error) {
            if (error) throw error;
            that.fs.readFile('/myFileLink', 'utf8', function(error, data) {
              if(error) throw error;
              _result = data;
              complete = true;
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toEqual(contents);
      });
    });
  });

});