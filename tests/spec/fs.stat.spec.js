define(["IDBFS"], function(IDBFS) {

  describe('fs.stat', function() {
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
      expect(typeof this.fs.stat).toEqual('function');
    });

    it('should return an error if path does not exist', function() {
      var complete = false;
      var _error, _result;

      this.fs.stat('/tmp', function(error, result) {
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

    it('should return a stat object if path exists', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.stat('/', function(error, result) {
        _error = error;
        _result = result;

        complete = true;
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toBeDefined();
        expect(_result['dev']).toEqual(that.db_name);
        expect(_result['size']).toBeDefined();
        expect(_result['nlinks']).toEqual(jasmine.any(Number));
        expect(_result['atime']).toEqual(jasmine.any(Number));
        expect(_result['mtime']).toEqual(jasmine.any(Number));
        expect(_result['ctime']).toEqual(jasmine.any(Number));
        expect(_result['type']).toBeDefined();
      });
    });

    it('should follow symbolic links and return a stat object for the resulting path', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;
        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;
          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _node = result['node'];
            that.fs.symlink('/myfile', '/myfilelink', function(error) {
              if(error) throw error;

              that.fs.stat('/myfilelink', function(error, result) {
                _error = error;
                _result = result;
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
        expect(_result).toBeDefined();
        expect(_node).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toEqual(_node);
      });
    });

    it('should return a stat object for a valid descriptor', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.open('/myfile', 'w+', function(error, result) {
        if(error) throw error;

        var fd = result;
        that.fs.fstat(fd, function(error, result) {
          _error = error;
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
        expect(_result['node']).toBeDefined();
        expect(_result['dev']).toEqual(that.db_name);
        expect(_result['size']).toBeDefined();
        expect(_result['nlinks']).toEqual(jasmine.any(Number));
        expect(_result['atime']).toEqual(jasmine.any(Number));
        expect(_result['mtime']).toEqual(jasmine.any(Number));
        expect(_result['ctime']).toEqual(jasmine.any(Number));
        expect(_result['type']).toBeDefined();
      });
    });
  });

});