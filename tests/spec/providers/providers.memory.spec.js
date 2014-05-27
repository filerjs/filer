var Filer = require('../../..');
var expect = require('chai').expect;

describe("Filer.FileSystem.providers.Memory", function() {
  it("is supported -- if it isn't, none of these tests can run.", function() {
    expect(Filer.FileSystem.providers.Memory.isSupported()).to.be.true;
  });

  it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
    var memoryProvider = new Filer.FileSystem.providers.Memory();
    expect(memoryProvider.open).to.be.a('function');
    expect(memoryProvider.getReadOnlyContext).to.be.a('function');
    expect(memoryProvider.getReadWriteContext).to.be.a('function');
  });

  describe("Memory provider DBs are sharable", function() {
    it("should share a single memory db when name is the same", function(done) {
      var provider1;
      var provider2;
      var provider3;
      var name1 = 'memory-db';
      var name2 = 'memory-db2';

      provider1 = new Filer.FileSystem.providers.Memory(name1);
      provider1.open(function(error, firstAccess) {
        expect(error).not.to.exist;
        expect(firstAccess).to.be.true;

        provider2 = new Filer.FileSystem.providers.Memory(name1);
        provider2.open(function(error, firstAccess) {
          expect(error).not.to.exist;
          expect(firstAccess).to.be.false;
          expect(provider1.db).to.equal(provider2.db);

          provider3 = new Filer.FileSystem.providers.Memory(name2);
          provider3.open(function(error, firstAccess) {
            expect(error).not.to.exist;
            expect(firstAccess).to.be.true;
            expect(provider3.db).not.to.equal(provider2.db);

            done();
          });
        });
      });
    });
  });

  describe("open an Memory provider", function() {
    it("should open a new Memory database", function(done) {
      var provider = new Filer.FileSystem.providers.Memory();
      provider.open(function(error, firstAccess) {
        expect(error).not.to.exist;
        expect(firstAccess).to.be.true;
        done();
      });
    });
  });

  describe("Read/Write operations on an Memory provider", function() {
    it("should allow put() and get()", function(done) {
      var provider = new Filer.FileSystem.providers.Memory();
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
      var provider = new Filer.FileSystem.providers.Memory();
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
      var provider = new Filer.FileSystem.providers.Memory();
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

    it("should fail when trying to write on ReadOnlyContext", function(done) {
      var provider = new Filer.FileSystem.providers.Memory();
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
