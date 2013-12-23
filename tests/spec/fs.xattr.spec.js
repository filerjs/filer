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

    it('should error when setting with a null value', function () {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', null, function (error) {
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

    it ('should error when getting an attribute with a name that is empty', function (error) {
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

    it('should error when getting an attribute where the name is not a string', function (error) {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.getxattr('/testfile', 89, function (error, value) {
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

    it('should error when getting an attribute that does not exist', function (error) {
      var complete = false;
      var _error;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.getxattr('/testfile', 'test', function (error, value) {
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

    it('should error when file descriptor is invalid', function (error) {
      var completeSet, completeGet;
      var _errorSet, _errorGet;
      var that = this;
      var _value;

      completeSet = completeGet = false;

      that.fs.fsetxattr(1, 'test', 'value', function (error) { 
        _errorSet = error;
        completeSet = true;
      });

      that.fs.fgetxattr(1, 'test', function (error, value) {
        _errorGet = error;
        _value = value;
        completeGet = true;
      });

      waitsFor(function () {
        return completeSet && completeGet;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_value).toEqual(null);
        expect(_errorSet).toBeDefined();
        expect(_errorSet.name).toEqual('EBadFileDescriptor');
        expect(_errorGet).toBeDefined();
        expect(_errorGet.name).toEqual('EBadFileDescriptor');
      });
    });

    it('should set and get an extended attribute of a path', function (error) {
      var complete = false;
      var _errorSet;
      var that = this;
      var name = 'test';
      var _value;;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', name, 'somevalue', function (error) {
          _errorSet = error;

          that.fs.getxattr('/testfile', name, function (error, value) {
            _errorGet = error;
            _value = value;
            complete = true;
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_errorSet).toEqual(null);
        expect(_errorGet).toEqual(null);
        expect(_value).toEqual('somevalue');
      });
    });

    it('should set and get an empty string as a value', function (error) {
      var complete = false;
      var _error;
      var _value;
      var that = this;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', '', function (error) {
          _error = error;

          that.fs.getxattr('/testfile', 'test', function (error, value) {
            _error = error;
            _value = value;
            complete = true;
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        expect(_value).toBeDefined();
        expect(_value).toEqual('');
      });
    });

    it('should set and get an extended attribute for a valid file descriptor', function (error) {
      var complete = false;
      var _errorSet, _errorGet;
      var _value;
      var that = this;
      var ofd;

      that.fs.open('/testfile', 'w', function (error, result) {
        if (error) throw error;

        ofd = result;

        that.fs.fsetxattr(ofd, 'test', 'value', function (error) {
          _errorSet = error;

          that.fs.fgetxattr(ofd, 'test', function (error, value) {
            _errorGet = error;
            _value = value;
            complete = true;
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_errorSet).toEqual(null);
        expect(_errorGet).toEqual(null);
        expect(_value).toBeDefined();
        expect(_value).toEqual('value');
      });
    });

    it('should set/get an object to an extended attribute', function (error) {
      var complete = false;
      var _error;
      var that = this;
      var value;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', { key1: 'test', key2: 'value', key3: 87 }, function (error) {
          _error = error;

          that.fs.getxattr('/testfile', 'test', function (error, value) {
            _error = error;
            _value = value;
            complete = true;
          });
        });
      });

      waitsFor(function () { 
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        expect(_value).toEqual({ key1: 'test', key2: 'value', key3: 87 });
      });
    });

    it('should update/overwrite an existing extended attribute', function (error) {
      var complete = false;
      var _error;
      var that = this;
      var _value1, _value2, _value3;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', 'value', function (error) {
          _error = error;

          that.fs.getxattr('/testfile', 'test', function (error, value) {
            _error = error;
            _value1 = value;

            that.fs.setxattr('/testfile', 'test', { o: 'object', t: 'test' }, function (error) {
              _error = error;

              that.fs.getxattr('/testfile', 'test', function (error, value) {
                _error = error;
                _value2 = value;

                that.fs.setxattr('/testfile', 'test', 100, 'REPLACE', function (error) {
                  _error = error;

                  that.fs.getxattr('/testfile', 'test', function (error, value) {
                    _error = error;
                    _value3 = value;
                    complete = true;
                  });
                });
              });
            });
          });
        })
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete' , DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        expect(_value1).toEqual('value');
        expect(_value2).toEqual({ o: 'object', t: 'test' });
        expect(_value3).toEqual(100);
      });
    });

    it('should set multiple extended attributes for a path', function (error) {
      var complete = false;
      var _error;
      var that = this;
      var _value1, _value2;

      that.fs.writeFile('/testfile', '', function (error) {
        if (error) throw error;

        that.fs.setxattr('/testfile', 'test', 89, function (error) {
          _error = error;

          that.fs.setxattr('/testfile', 'other', 'attribute', function (error) {
            _error = error;

            that.fs.getxattr('/testfile', 'test', function (error, value) {
              _error = error;
              _value1 = value;

              that.fs.getxattr('/testfile', 'other', function (error, value) {
                _error = error;
                _value2 = value;
                complete = true;
              });
            });
          });
        });
      });

      waitsFor(function () {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function () {
        expect(_error).toEqual(null);
        expect(_value1).toEqual(89);
        expect(_value2).toEqual('attribute');
      });
    });
  });
});