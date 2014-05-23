var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

if(!Filer.FileSystem.providers.WebSQL.isSupported()) {
  console.log("Skipping Filer.FileSystem.providers.WebSQL tests, since WebSQL isn't supported.");
} else {
  describe("Filer.FileSystem.providers.WebSQL", function() {
    it("is supported -- if it isn't, none of these tests can run.", function() {
      expect(Filer.FileSystem.providers.WebSQL.isSupported()).to.be.true;
    });

    it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
      var webSQLProvider = new Filer.FileSystem.providers.WebSQL();
      expect(webSQLProvider.open).to.be.a('function');
      expect(webSQLProvider.getReadOnlyContext).to.be.a('function');
      expect(webSQLProvider.getReadWriteContext).to.be.a('function');
    });

    describe("open an WebSQL provider", function() {
      var _provider;

      beforeEach(function() {
        _provider = new util.providers.WebSQL(util.uniqueName());
        _provider.init();
      });

      afterEach(function(done) {
        _provider.cleanup(done);
        _provider = null;
      });

      it("should open a new WebSQL database", function(done) {
        var provider = _provider.provider;
        provider.open(function(error, firstAccess) {
          expect(error).not.to.exist;
          expect(firstAccess).to.be.true;
          done();
        });
      });
    });

    describe("Read/Write operations on an WebSQL provider", function() {
      var _provider;

      beforeEach(function() {
        _provider = new util.providers.WebSQL(util.uniqueName());
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
              expect(result).to.equal("value");
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
