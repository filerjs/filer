define(["IDBFS"], function(IDBFS) {

  // We reuse the same set of tests for all adapters.
  // buildTestsFor() creates a set of tests bound to an
  // adapter, and uses a Memory() provider internally.

  function buildTestsFor(adapterName, buildAdapter) {
    function encode(str) {
      // TextEncoder is either native, or shimmed by IDBFS
      return (new TextEncoder("utf-8")).encode(str);
    }

    // Make some string + binary buffer versions of things we'll need
    var valueStr  = "value", valueBuffer = encode(valueStr);
    var value1Str = "value1", value1Buffer = encode(value1Str);
    var value2Str = "value2", value2Buffer = encode(value2Str);

    function createProvider() {
      var memoryProvider = new IDBFS.FileSystem.providers.Memory();
      return buildAdapter(memoryProvider);
    }

    describe("IDBFS.FileSystem.adapters." + adapterName, function() {
      it("is supported -- if it isn't, none of these tests can run.", function() {
        // Allow for combined adapters (e.g., 'AES+Zlib') joined by '+'
        adapterName.split('+').forEach(function(name) {
          expect(IDBFS.FileSystem.adapters[name].isSupported()).toEqual(true);
        });
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

      describe("Read/Write operations on a Memory provider with an " + adapterName + " adapter", function() {
        it("should allow put() and get()", function() {
          var complete = false;
          var _error, _result;

          var provider = createProvider();
          provider.open(function(err, firstAccess) {
            _error = err;

            var context = provider.getReadWriteContext();
            context.put("key", valueBuffer, function(err, result) {
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
            expect(_result).toEqual(valueBuffer);
          });
        });

        it("should allow delete()", function() {
          var complete = false;
          var _error, _result;

          var provider = createProvider();
          provider.open(function(err, firstAccess) {
            _error = err;

            var context = provider.getReadWriteContext();
            context.put("key", valueBuffer, function(err, result) {
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
            context.put("key1", value1Buffer, function(err, result) {
              _error = _error || err;
              context.put("key2", value2Buffer, function(err, result) {
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
            context.put("key1", value1Buffer, function(err, result) {
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


  // Encryption
  buildTestsFor('AES', function buildAdapter(provider) {
    var passphrase = '' + Date.now();
    return new IDBFS.FileSystem.adapters.AES(passphrase, provider);
  });
  buildTestsFor('TripleDES', function buildAdapter(provider) {
    var passphrase = '' + Date.now();
    return new IDBFS.FileSystem.adapters.TripleDES(passphrase, provider);
  });
  buildTestsFor('Rabbit', function buildAdapter(provider) {
    var passphrase = '' + Date.now();
    return new IDBFS.FileSystem.adapters.Rabbit(passphrase, provider);
  });

  // Compression
  buildTestsFor('Zlib', function buildAdapter(provider) {
    return new IDBFS.FileSystem.adapters.Zlib(provider);
  });

  // AES + Zlib together
  buildTestsFor('AES+Zlib', function buildAdapter(provider) {
    var passphrase = '' + Date.now();
    var zlib = new IDBFS.FileSystem.adapters.Zlib(provider);
    var AESwithZlib = new IDBFS.FileSystem.adapters.AES(passphrase, zlib);
    return AESwithZlib;
  });

});
