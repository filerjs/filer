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

    // it('should be a function', function() {
    //   expect(typeof this.fs.utimes).toEqual('function');
    // });

    // it('should error when atime is negative', function () {
    //   var complete = false;
    //   var _error;
    //   var that = this;

    //   that.fs.writeFile('/testfile', '', function(error) {
    //     if (error) throw error;

    //     that.fs.utimes('/testfile', -1, Date.now(), function (error) {
    //       _error = error;
    //       complete = true;
    //     });
    //   });

    //   waitsFor(function () { 
    //     return complete;
    //   }, 'test to complete', DEFAULT_TIMEOUT);

    //   runs(function () {
    //     expect(_error).toBeDefined();
    //   });
    // });

    // it('should error when mtime is negative', function () {
    //   var complete = false;
    //   var _error;
    //   var that = this;

    //   that.fs.writeFile('/testfile', '', function(error) {
    //     if (error) throw error;

    //     that.fs.utimes('/testfile', Date.now(), -1, function (error) {
    //       _error = error;
    //       complete = true;
    //     });
    //   });

    //   waitsFor(function () { 
    //     return complete;
    //   }, 'test to complete', DEFAULT_TIMEOUT);

    //   runs(function () {
    //     expect(_error).toBeDefined();
    //   });
    // });

    // it('should error when atime is as invalid Datetime', function () {
    //   var complete = false;
    //   var _error;
    //   var that = this;

    //   that.fs.writeFile('/testfile', '', function (error) {
    //     if (error) throw error;

    //     that.fs.utimes('/testfile', 'invalid datetime', Date.now(), function (error) {
    //       _error = error;
    //       complete = true;
    //     });
    //   });

    //   waitsFor(function () { 
    //     return complete;
    //   }, 'test to complete', DEFAULT_TIMEOUT);

    //   runs(function () {
    //     expect(_error).toBeDefined();
    //   });
    // });

    // it('should error when mtime is as invalid Datetime', function () {
    //   var complete = false;
    //   var _error;
    //   var that = this;

    //   that.fs.writeFile('/testfile', '', function (error) {
    //     if (error) throw error;

    //     that.fs.utimes('/testfile', Date.now(), 'invalid datetime', function (error) {
    //       _error = error;
    //       complete = true;
    //     });
    //   });

    //   waitsFor(function () { 
    //     return complete;
    //   }, 'test to complete', DEFAULT_TIMEOUT);

    //   runs(function () {
    //     expect(_error).toBeDefined();
    //   });
    // });

    it('should change atime and mtime of a file path)', function () {
      var complete = false;
      var _error;
      var that = this;

      var stat;

      var atime = Date.parse('1 Oct 2000 15:33:22');
      var mtime = Date.parse('30 Sep 2000 06:43:54');

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        console.log('created file');
        that.fs.utimes('/testfile', atime, mtime, function (error) {
          _error = error;

          console.log('getting stats');
          that.fs.stat('/testfile', function (error, rstat) {
            if (error) throw error;

            console.log('got stats');
            stat = rstat;
            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toEqual(null);
        expect(stat.atime).toEqual(atime);
        expect(stat.mtime).toEqual(mtime);
      });
    });
  });
});