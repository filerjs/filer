define(["IDBFS"], function(IDBFS) {

  // We reuse the same set of tests for all crypto adapters.
  // buildTestsFor() creates a set of tests bound to a crypto
  // adapter, and uses a Memory() provider internally.

  function buildTestsFor(adapterName) {
    var passphrase = '' + Date.now();

    function createProvider() {
      var memoryProvider = new IDBFS.FileSystem.providers.Memory();
      return new IDBFS.FileSystem.adapters[adapterName](passphrase, memoryProvider);
    }

    describe("IDBFS.FileSystem.adapters." + adapterName, function() {
      it("is supported -- if it isn't, none of these tests can run.", function() {
        expect(IDBFS.FileSystem.adapters[adapterName].isSupported()).toEqual(true);
      });

      it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
        var provider = createProvider();
        expect(typeof provider.open).toEqual('function');
        expect(typeof provider.getReadOnlyContext).toEqual('function');
        expect(typeof provider.getReadWriteContext).toEqual('function');
      });

      describe("open a Memory provider with an " + adapterName + " adapter", function() {
        it("should open a new database", function() {
          var complete = false;
          var _error, _result;

          var provider = createProvider();
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

      describe("Read/Write operations on a Memory provider with an " + adapterName + "adapter", function() {
        it("should allow put() and get()", function() {
          var complete = false;
          var _error, _result;

          var provider = createProvider();
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

          var provider = createProvider();
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

          var provider = createProvider();
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

          var provider = createProvider();
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
  }

  buildTestsFor('AES');
  buildTestsFor('TripleDES');
  buildTestsFor('Rabbit');

});
