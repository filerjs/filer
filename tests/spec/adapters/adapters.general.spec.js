define(["Filer", "util"], function(Filer, util) {

  // We reuse the same set of tests for all adapters.
  // buildTestsFor() creates a set of tests bound to an
  // adapter, and uses the provider set on the query string
  // (defaults to best available/supported provider, see test-utils.js).
  function buildTestsFor(adapterName, buildAdapter) {
    function encode(str) {
      // TextEncoder is either native, or shimmed by Filer
      return (new TextEncoder("utf-8")).encode(str);
    }

    // Make some string + binary buffer versions of things we'll need
    var valueStr  = "value", valueBuffer = encode(valueStr);
    var value1Str = "value1", value1Buffer = encode(value1Str);
    var value2Str = "value2", value2Buffer = encode(value2Str);

    function createProvider() {
      return buildAdapter(util.provider().provider);
    }

    describe("Filer.FileSystem.adapters." + adapterName, function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

      it("is supported -- if it isn't, none of these tests can run.", function() {
        // Allow for combined adapters (e.g., 'Encryption+Compression') joined by '+'
        adapterName.split('+').forEach(function(name) {
          expect(Filer.FileSystem.adapters[name].isSupported()).to.be.true;
        });
      });

      it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
        var provider = createProvider();
        expect(provider.open).to.be.a('function');
        expect(provider.getReadOnlyContext).to.be.a('function');
        expect(provider.getReadWriteContext).to.be.a('function');
      });
    });

    describe("open a provider with an " + adapterName + " adapter", function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

      it("should open a new database", function(done) {
        var provider = createProvider();
        provider.open(function(error, firstAccess) {
          expect(error).not.to.exist;
          // NOTE: we test firstAccess logic in the individual provider tests
          // (see tests/spec/providers/*) but can't easily/actually test it here,
          // since the provider-agnostic code in test-utils pre-creates a
          // FileSystem object, thus eating the first access info.
          // See https://github.com/js-platform/filer/issues/127
          done();
        });
      });
    });

    describe("Read/Write operations on a provider with an " + adapterName + " adapter", function() {
      beforeEach(util.setup);
      afterEach(util.cleanup);

      it("should allow put() and get()", function(done) {
        var provider = createProvider();
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadWriteContext();
          context.put("key", valueBuffer, function(error, result) {
            if(error) throw error;

            context.get("key", function(error, result) {
              expect(error).not.to.exist;
              expect(util.typedArrayEqual(result, valueBuffer)).to.be.true;
              done();
            });
          });
        });
      });

      it("should allow delete()", function(done) {
        var provider = createProvider();
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadWriteContext();
          context.put("key", valueBuffer, function(error, result) {
            if(error) throw error;

            context.delete("key", function(error, result) {
              if(error) throw error;

              context.get("key", function(error, result) {
                expect(error).not.to.exist;
                expect(result).not.to.exist;
                done();
              });
            });
          });
        });
      });

      it("should allow clear()", function(done) {
        var provider = createProvider();
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadWriteContext();
          context.put("key1", value1Buffer, function(error, result) {
            if(error) throw error;

            context.put("key2", value2Buffer, function(error, result) {
              if(error) throw error;

              context.clear(function(err) {
                if(error) throw error;

                context.get("key1", function(error, result) {
                  if(error) throw error;
                  expect(result).not.to.exist;

                  context.get("key2", function(error, result) {
                    expect(error).not.to.exist;
                    expect(result).not.to.exist;
                      done();
                  });
                });
              });
            });
          });
        });
      });

      it("should fail when trying to write on ReadOnlyContext", function(done) {
        var provider = createProvider();
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadOnlyContext();
          context.put("key1", value1Buffer, function(error, result) {
            expect(error).to.exist;
            expect(result).not.to.exist;
            done();
          });
        });
      });
    });
  }

  // Encryption
  buildTestsFor('Encryption', function buildAdapter(provider) {
    var passphrase = '' + Date.now();
    return new Filer.FileSystem.adapters.Encryption(passphrase, provider);
  });

  // Compression
  buildTestsFor('Compression', function buildAdapter(provider) {
    return new Filer.FileSystem.adapters.Compression(provider);
  });

  // Encryption + Compression together
  buildTestsFor('Encryption+Compression', function buildAdapter(provider) {
    var passphrase = '' + Date.now();
    var compression = new Filer.FileSystem.adapters.Compression(provider);
    var encryptionWithCompression = new Filer.FileSystem.adapters.Encryption(passphrase, compression);
    return encryptionWithCompression;
  });

});
