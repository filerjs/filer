var Buffer = require('../../..').Buffer;
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

/**
 * Due to the different setup/cleanup needs of the built-in providers,
 * we use the test provider wrappers instead of the raw providers themselves.
 */
module.exports = function createProviderTestsFor(providerName, testProvider) {
  if(!testProvider.isSupported()) {
    console.log("Skipping provider tests for `" + providerName +"'--not supported in current environment.");
    return;
  }

  describe("Filer Provider Tests for " + providerName, function() {
    var _provider;
    var provider;

    beforeEach(function() {
      _provider = new testProvider(util.uniqueName());
      _provider.init();
      provider = _provider.provider;
    });

    afterEach(function(done) {
      _provider.cleanup(done);
      _provider = null;
      provider = null;
    });


    it("has open, getReadOnlyContext, and getReadWriteContext instance methods", function() {
      expect(provider.open).to.be.a('function');
      expect(provider.getReadOnlyContext).to.be.a('function');
      expect(provider.getReadWriteContext).to.be.a('function');
    });

    it("should open a new provider database", function(done) {
      provider.open(function(error) {
        expect(error).not.to.exist;
        done();
      });
    });

    it("should allow putObject() and getObject()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        // Simple JS Object
        var value = {
          a: "a",
          b: 1,
          c: true,
          d: [1,2,3],
          e: {
            e1: ['a', 'b', 'c']
          }
        };
        context.putObject("key", value, function(error) {
          if(error) throw error;

          context.getObject("key", function(error, result) {
            expect(error).not.to.exist;
            expect(result).to.be.an('object');
            expect(result).to.deep.equal(value);
            done();
          });
        });
      });
    });

    it("should allow putBuffer() and getBuffer()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        // Filer Buffer
        var buf = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        context.putBuffer("key", buf, function(error) {
          if(error) throw error;

          context.getBuffer("key", function(error, result) {
            expect(error).not.to.exist;
            expect(Buffer.isBuffer(result)).to.be.true;
            expect(result).to.deep.equal(buf);
            done();
          });
        });
      });
    });

    it("should allow zero-length Buffers with putBuffer() and getBuffer()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        // Zero-length Filer Buffer
        var buf = new Buffer(new ArrayBuffer(0));
        context.putBuffer("key", buf, function(error) {
          if(error) throw error;

          context.getBuffer("key", function(error, result) {
            expect(error).not.to.exist;
            expect(Buffer.isBuffer(result)).to.be.true;
            expect(result).to.deep.equal(buf);
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
        context.putObject("key", "value", function(error) {
          if(error) throw error;

          context.delete("key", function(error) {
            if(error) throw error;

            context.getObject("key", function(error, result) {
              expect(error).not.to.exist;
              expect(result).not.to.exist;
              done();
            });
          });
        });
      });
    });

    it("should allow clear()", function(done) {
      provider.open(function(error, firstAccess) {
        if(error) throw error;

        var context = provider.getReadWriteContext();
        context.putObject("key1", "value1", function(error) {
          if(error) throw error;

          context.putObject("key2", "value2", function(error) {
            if(error) throw error;

            context.clear(function(err) {
              if(error) throw error;

              context.getObject("key1", function(error, result) {
                if(error) throw error;
                expect(result).not.to.exist;

                context.getObject("key2", function(error, result) {
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
  });
};
