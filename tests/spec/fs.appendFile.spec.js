define(["Filer"], function(Filer) {

  describe('fs.appendFile', function() {
    beforeEach(function() {
      this.db_name = mk_db_name();
      this.fs = new Filer.FileSystem({
        name: this.db_name,
        flags: 'FORMAT'
      });
      this.fs.writeFile('/myfile', "This is a file.", { encoding: 'utf8' }, function(error) {
        if(error) throw error;
      });
    });

    afterEach(function() {
      indexedDB.deleteDatabase(this.db_name);
      delete this.fs;
    });

    it('should be a function', function() {
      expect(typeof this.fs.appendFile).toEqual('function');
    });

    it('should append a utf8 file without specifying utf8 in appendFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";
      var more = " Appended.";

      that.fs.appendFile('/myfile', more, function(error) {
        if(error) throw error;
      });
      that.fs.readFile('/myfile', 'utf8', function(error, data) {
        if(error) throw error;
        _result = data;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(contents+more);
      });
    });

    it('should append a utf8 file with "utf8" option to appendFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";
      var more = " Appended.";

      that.fs.appendFile('/myfile', more, 'utf8', function(error) {
        if(error) throw error;
      });
      that.fs.readFile('/myfile', 'utf8', function(error, data) {
        if(error) throw error;
        _result = data;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(contents+more);
      });
    });

    it('should append a utf8 file with {encoding: "utf8"} option to appendFile', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      var contents = "This is a file.";
      var more = " Appended.";

      that.fs.appendFile('/myfile', more, { encoding: 'utf8' }, function(error) {
        if(error) throw error;
      });
      that.fs.readFile('/myfile', { encoding: 'utf8' }, function(error, data) {
        if(error) throw error;
        _result = data;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(contents+more);
      });
    });

    it('should append a binary file', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      // String and utf8 binary encoded versions of the same thing:
      var contents = "This is a file.";
      var binary = new Uint8Array([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46]);
      var more = " Appended.";
      var binary2 = new Uint8Array([32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);
      var binary3 = new Uint8Array([84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 102, 105, 108, 101, 46,
                                    32, 65, 112, 112, 101, 110, 100, 101, 100, 46]);

      that.fs.writeFile('/mybinaryfile', binary, function(error) {
        if(error) throw error;
      });
      that.fs.appendFile('/mybinaryfile', binary2, function(error) {
        if(error) throw error;
      });
      that.fs.readFile('/mybinaryfile', 'ascii', function(error, data) {
        if(error) throw error;
        _result = data;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_result).toEqual(binary3);
      });
    });

    it('should follow symbolic links', function () {
      var complete = false;
      var _result;
      var that = this;

      var contents = "This is a file.";
      var more = " Appended.";

      that.fs.symlink('/myfile', '/myFileLink', function (error) {
        if (error) throw error;
      });
      that.fs.appendFile('/myFileLink', more, 'utf8', function (error) {
        if (error) throw error;
      });
      that.fs.readFile('/myFileLink', 'utf8', function(error, data) {
        if(error) throw error;
        _result = data;
        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toEqual(contents+more);
      });
    });
  });

});