define(["IDBFS"], function(IDBFS) {

 describe('fs.readdir', function() {
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
      expect(typeof this.fs.readdir).toEqual('function');
    });

    it('should return an error if the path does not exist', function() {
      var complete = false;
      var _error;
      var that = this;

      that.fs.readdir('/tmp/mydir', function(error) {
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

    it('should return a list of files from an existing directory', function() {
      var complete = false;
      var _error, _files;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        that.fs.readdir('/', function(error, result) {
          _error = error;
          _files = result;

          complete = true;
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_files.length).toEqual(1);
        expect(_files[0]).toEqual('tmp');
      });
    });

    it('should follow symbolic links', function() {
      var complete = false;
      var _error, _files;
      var that = this;

      that.fs.mkdir('/tmp', function(error) {
        if(error) throw error;
        that.fs.symlink('/', '/tmp/dirLink', function(error) {
          if(error) throw error;
          that.fs.readdir('/tmp/dirLink', function(error, result) {
            _error = error;
            _files = result;

            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_files.length).toEqual(1);
        expect(_files[0]).toEqual('tmp');
      });
    });
  });

});