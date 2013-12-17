define(["IDBFS"], function(IDBFS) {

  describe('fs.utimes', function() {
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
      expect(typeof this.fs.utimes).toEqual('function');
    });

    it('should error when atime is negative', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function(error) {
        if (error) throw error;

        that.fs.utimes('/testfile', -1, Date.now(), function (error) {
          _error = error;
          complete = true;
        });
      });

      waitsFor(function () { 
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('EInvalid');
      });
    });

    it('should error when mtime is negative', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function(error) {
        if (error) throw error;

        that.fs.utimes('/testfile', Date.now(), -1, function (error) {
          _error = error;
          complete = true;
        });
      });

      waitsFor(function () { 
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('EInvalid');
      });
    });

    it('should error when atime is as invalid number', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.utimes('/testfile', 'invalid datetime', Date.now(), function (error) {
          _error = error;
          complete = true;
        });
      });

      waitsFor(function () { 
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('EInvalid');
      });
    });

    it ('should error when path does not exist', function () {
      var complete = false;
      var _error;
      var that = this;

      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');
      
      that.fs.utimes('/pathdoesnotexist', atime, mtime, function (error) {
        _error = error;
        complete = true;
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('ENoEntry');
      });
    });

    it('should error when mtime is an invalid number', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.utimes('/testfile', Date.now(), 'invalid datetime', function (error) {
          _error = error;
          complete = true;
        });
      });

      waitsFor(function () { 
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('EInvalid');
      });
    });

    it ('should error when file descriptor is invalid', function () {
      var complete = false;
      var _error;
      var that = this;

      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      that.fs.futimes(1, atime, mtime, function (error) {
        _error = error;
        complete = true;
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('EBadFileDescriptor');
      });
    });

    it('should change atime and mtime of a file path', function () {
      var complete = false;
      var _error;
      var that = this;

      var _stat;

      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.utimes('/testfile', atime, mtime, function (error) {
          _error = error;

          that.fs.stat('/testfile', function (error, stat) {
            if (error) throw error;

            _stat = stat;
            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(_stat.atime).toEqual(atime);
        expect(_stat.mtime).toEqual(mtime);
      });
    });

    it ('should change atime and mtime for a valid file descriptor', function (error) {
      var complete = false;
      var _error;
      var that = this;

      var ofd;
      var _stat;

      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      that.fs.open('/testfile', 'w', function (error, result) {
        if (error) throw error;

        ofd = result;

        that.fs.futimes(ofd, atime, mtime, function (error) {
          _error = error;
          
          that.fs.fstat(ofd, function (error, stat) {
            if (error) throw error;

            _stat = stat;
            complete = true;
          });  
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        expect(_stat.atime).toEqual(atime);
        expect(_stat.mtime).toEqual(mtime);
      });
    });

    it ('should update atime and mtime of directory path', function (error) {
      var complete = false
      var _error;

      //Note: required as the filesystem somehow gets removed from the Jasmine object
      var fs = this.fs;

      var _stat;

      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      fs.mkdir('/testdir', function (error) {
        if (error) throw error;

        fs.utimes('/testdir', atime, mtime, function (error) {
          _error = error;

          fs.stat('/testdir', function (error, stat) {
            if (error) throw error;

            _stat = stat;
            complete = true;
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        expect(_stat.atime).toEqual(atime);
        expect(_stat.mtime).toEqual(mtime);
        delete fs;
      });
    });

    it ('should update atime and mtime if they are null', function () {
      var complete = false;
      var _error;
      var that = this;

      var atimeEst;
      var mtimeEst;
      var now;

      that.fs.writeFile('/myfile', '', function (error) {
        if (error) throw error;

        that.fs.utimes('/myfile', null, null, function (error) {
          _error = error;

          now = Date.now();

          that.fs.stat('/myfile', function (error, stat) {
            if (error) throw error;
            
            atimeEst = now - stat.atime;
            mtimeEst = now - stat.mtime;
            complete = true;
          });
        });
      });

      waitsFor(function (){
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        // Note: testing estimation as time may differ by a couple of milliseconds
        // This number should be increased if tests are on slow systems
        expect(atimeEst).toBeLessThan(10);
        expect(mtimeEst).toBeLessThan(10);
      });
    });
  });
});