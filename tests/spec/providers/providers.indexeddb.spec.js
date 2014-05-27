var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

if(!Filer.FileSystem.providers.IndexedDB.isSupported()) {
  console.log("Skipping Filer.FileSystem.providers.IndexedDB tests, since IndexedDB isn't supported.");
} else {
  describe("Filer.FileSystem.providers.IndexedDB", function() {
    it("is supported -- if it isn't, none of these tests can run.", function() {
      expect(Filer.FileSystem.providers.IndexedDB.isSupported()).to.be.true;
    });

    it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
      var indexedDBProvider = new Filer.FileSystem.providers.IndexedDB();
      expect(indexedDBProvider.open).to.be.a('function');
      expect(indexedDBProvider.getReadOnlyContext).to.be.a('function');
      expect(indexedDBProvider.getReadWriteContext).to.be.a('function');
    });

    describe("open an IndexedDB provider", function() {
      var _provider;

      beforeEach(function() {
        _provider = new util.providers.IndexedDB(util.uniqueName());
        _provider.init();
      });

      afterEach(function(done) {
        _provider.cleanup(done);
        _provider = null;
      });

      it("should open a new IndexedDB database", function(done) {
        var provider = _provider.provider;
        provider.open(function(error, firstAccess) {
          expect(error).not.to.exist;
          expect(firstAccess).to.be.true;
          done();
        });
      });
    });

    describe("Read/Write operations on an IndexedDB provider", function() {
      var _provider;

      beforeEach(function() {
        _provider = new util.providers.IndexedDB(util.uniqueName());
        _provider.init();
      });

      afterEach(function(done) {
        _provider.cleanup(done);
        _provider = null;
      });

      it("should allow put() and get()", function(done) {
        var provider = _provider.provider;
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadWriteContext();
          context.put("key", "value", function(error, result) {
            if(error) throw error;

            context.get("key", function(error, result) {
              expect(error).not.to.exist;
              expect(result).to.equal('value');
              done();
            });
          });
        });
      });

      it("should allow delete()", function(done) {
        var provider = _provider.provider;
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadWriteContext();
          context.put("key", "value", function(error, result) {
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
        var provider = _provider.provider;
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadWriteContext();
          context.put("key1", "value1", function(error, result) {
            if(error) throw error;

            context.put("key2", "value2", function(error, result) {
              if(error) throw error;

              context.clear(function(err) {
                if(error) throw error;

                context.get("key1", function(error, result) {
                  if(error) throw error;
                  expect(result).not.to.exist;

                  context.get("key2", function(error, result) {
                    if(error) throw error;
                    expect(result).not.to.exist;
                    done();
                  });
                });
              });
            });
          });
        });
      });

      /**
       * With issue 123 (see https://github.com/js-platform/filer/issues/128) we had to
       * start using readwrite contexts everywhere with IndexedDB. Skipping for now.
       */
      it.skip("should fail when trying to write on ReadOnlyContext", function(done) {
        var provider = _provider.provider;
        provider.open(function(error, firstAccess) {
          if(error) throw error;

          var context = provider.getReadOnlyContext();
          context.put("key1", "value1", function(error, result) {
            expect(error).to.exist;
            expect(result).not.to.exist;
            done();
          });
        });
      });
    });

  });

}
