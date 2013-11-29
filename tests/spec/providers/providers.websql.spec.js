define(["IDBFS"], function(IDBFS) {

  var WEBSQL_NAME = "websql-test-db";

  function wipeDB(provider) {
    var context = provider.getReadWriteContext();
    context.clear(function(err) {
      if(err) {
        console.error("Problem clearing WebSQL db: [" + err.code + "] - " + err.message);
      }
    });
  }

  if(!IDBFS.FileSystem.providers.WebSQL.isSupported()) {
    console.log("Skipping IDBFS.FileSystem.providers.WebSQL tests, since WebSQL isn't supported.");
    return;
  }

  describe("IDBFS.FileSystem.providers.WebSQL", function() {
    it("is supported -- if it isn't, none of these tests can run.", function() {
      expect(IDBFS.FileSystem.providers.WebSQL.isSupported()).toEqual(true);
    });

    it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
      var webSQLProvider = new IDBFS.FileSystem.providers.WebSQL();
      expect(typeof webSQLProvider.open).toEqual('function');
      expect(typeof webSQLProvider.getReadOnlyContext).toEqual('function');
      expect(typeof webSQLProvider.getReadWriteContext).toEqual('function');
    });

    describe("open an WebSQL provider", function() {
      afterEach(function() {
        wipeDB(this.provider);
      });

      it("should open a new WebSQL database", function() {
        var complete = false;
        var _error, _result;

        var provider = this.provider = new IDBFS.FileSystem.providers.WebSQL(WEBSQL_NAME);
        provider.open(function(err, firstAccess) {
          _error = err;
          _result = firstAccess;
          complete = true;
        });

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(true);
        });
      });
    });

    describe("Read/Write operations on an WebSQL provider", function() {
      afterEach(function() {
        wipeDB(this.provider);
      });

      it("should allow put() and get()", function() {
        var complete = false;
        var _error, _result;

        var provider = this.provider = new IDBFS.FileSystem.providers.WebSQL(WEBSQL_NAME);
        provider.open(function(err, firstAccess) {
          _error = err;

          var context = provider.getReadWriteContext();
          context.put("key", "value", function(err, result) {
            _error = _error || err;
            context.get("key", function(err, result) {
              _error = _error || err;
              _result = result;

              complete = true;
            });
          });
        });

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual("value");
        });
      });

      it("should allow delete()", function() {
        var complete = false;
        var _error, _result;

        var provider = this.provider = new IDBFS.FileSystem.providers.WebSQL(WEBSQL_NAME);
        provider.open(function(err, firstAccess) {
          _error = err;

          var context = provider.getReadWriteContext();
          context.put("key", "value", function(err, result) {
            _error = _error || err;
            context.delete("key", function(err, result) {
              _error = _error || err;
              context.get("key", function(err, result) {
                _error = _error || err;
                _result = result;

                complete = true;
              });
            });
          });
        });

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result).toEqual(null);
        });
      });

      it("should allow clear()", function() {
        var complete = false;
        var _error, _result1, _result2;

        var provider = this.provider = new IDBFS.FileSystem.providers.WebSQL(WEBSQL_NAME);
        provider.open(function(err, firstAccess) {
          _error = err;

          var context = provider.getReadWriteContext();
          context.put("key1", "value1", function(err, result) {
            _error = _error || err;
            context.put("key2", "value2", function(err, result) {
              _error = _error || err;

              context.clear(function(err) {
                _error = _error || err;

                context.get("key1", function(err, result) {
                  _error = _error || err;
                  _result1 = result;

                  context.get("key2", function(err, result) {
                    _error = _error || err;
                    _result2 = result;

                    complete = true;
                  });
                });
              });
            });
          });
        });

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toEqual(null);
          expect(_result1).toEqual(null);
          expect(_result2).toEqual(null);
        });
      });

      it("should fail when trying to write on ReadOnlyContext", function() {
        var complete = false;
        var _error, _result;

        var provider = this.provider = new IDBFS.FileSystem.providers.WebSQL(WEBSQL_NAME);
        provider.open(function(err, firstAccess) {
          _error = err;

          var context = provider.getReadOnlyContext();
          context.put("key1", "value1", function(err, result) {
            _error = _error || err;
            _result = result;

            complete = true;
          });
        });

        waitsFor(function() {
          return complete;
        }, 'test to complete', DEFAULT_TIMEOUT);

        runs(function() {
          expect(_error).toBeDefined();
          expect(_result).toEqual(null);
        });
      });
    });

  });

});
