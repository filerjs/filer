define(["Filer"], function(Filer) {

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

});
