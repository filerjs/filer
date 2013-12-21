define(["IDBFS"], function(IDBFS) {

  describe('fs.xattr', function() {
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

    it('should be a function', function () {
      expect(typeof this.fs.setxattr).toEqual('function');
      expect(typeof this.fs.getxattr).toEqual('function');
    });

    it('should error when setting with a name that is not a string', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 89, 'testvalue', function (error) {
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

    it('should error when setting with a name that is null', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', null, 'testvalue', function (error) {
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

    it('should error when setting with a falsy value', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', '', function (error) {
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

    it('should error when setting with an invalid flag', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', 'value', 'InvalidFlag', function (error) {
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

    it('should error when when setting an extended attribute which exists with XATTR_CREATE flag', function (error) {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', 'value', function (error) {
          if (error) throw error;

          that.fs.setxattr('/testfile', 'test', 'othervalue', 'CREATE', function (error) {
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
        expect(_error.name).toEqual('EExists');
      });
    });

    it('should error when setting an extended attribute which does not exist with XATTR_REPLACE flag', function (error) {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', 'value', 'REPLACE', function (error) {
          _error = error;
          complete = true;
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('ENoAttr');
      });
    });

    it ('should error when getting an attribute with a falsy name', function (error) {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.getxattr('/testfile', '', function (error, value) {
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

    it('should error when getting an attribute when a name is not a string', function (error) {
      var complete = false;
      var _error;
      // var that = this;

      var fs = this.fs;

      fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 89, function (error, value) {
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
  });
});