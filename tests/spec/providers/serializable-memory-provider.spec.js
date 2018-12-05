var { uniqueName, parseBJSON } = require('../../lib/test-utils.js');
var SerializableMemoryProvider = require('../../lib/serializable-memory-provider');
var expect = require('chai').expect;

describe('Filer Provider Tests for SerializableMemoryProvider', function() {
  var provider;

  /**
   * Simulate the sort of data a filesystem image would have
   */
  var image = {
    'c20b2b02-81f5-43af-b117-78bc0affd1b7': {
      name: 'file',
      size: 36,
      mtime: Date.now()
    },
    '85ad404e-c29b-4c63-bb21-69655375d367': Buffer.from('data')
  };
  function buildImageJSON() {
    return JSON.stringify(image);
  }

  beforeEach(function() {
    provider = new SerializableMemoryProvider(uniqueName(), buildImageJSON());
  });

  afterEach(function() {
    provider = null;
  });

  it('has open, getReadOnlyContext, and getReadWriteContext instance methods', function() {
    expect(provider.open).to.be.a('function');
    expect(provider.getReadOnlyContext).to.be.a('function');
    expect(provider.getReadWriteContext).to.be.a('function');
  });

  it('should open a new provider database', function(done) {
    provider.open(function(error) {
      expect(error).not.to.exist;
      done();
    });
  });

  it('should have expected Object type from imported image', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      context.getObject('c20b2b02-81f5-43af-b117-78bc0affd1b7', function(error, o) {
        if (error) throw error;

        expect(o).to.deep.equal(image['c20b2b02-81f5-43af-b117-78bc0affd1b7']);
        done();
      });
    });
  });

  it('should have expected Buffer type from imported image', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      context.getObject('85ad404e-c29b-4c63-bb21-69655375d367', function(error, o) {
        if (error) throw error;

        expect(o).to.deep.equal(image['85ad404e-c29b-4c63-bb21-69655375d367']);
        done();
      });
    });
  });

  it('should allow exporting the filesystem image', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var bjson = provider.export();
      var exported = parseBJSON(bjson);

      expect(exported['c20b2b02-81f5-43af-b117-78bc0affd1b7']).to.deep.equal(image['c20b2b02-81f5-43af-b117-78bc0affd1b7']);
      expect(exported['85ad404e-c29b-4c63-bb21-69655375d367']).to.deep.equal(image['85ad404e-c29b-4c63-bb21-69655375d367']);

      done();
    });
  });

  it('should allow putObject() and getObject()', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      // Simple JS Object
      var value = {
        a: 'a',
        b: 1,
        c: true,
        d: [1, 2, 3],
        e: {
          e1: ['a', 'b', 'c']
        }
      };
      context.putObject('key', value, function(error) {
        if (error) throw error;

        context.getObject('key', function(error, result) {
          expect(error).not.to.exist;
          expect(result).to.be.an('object');
          expect(result).to.deep.equal(value);
          done();
        });
      });
    });
  });

  it('should allow putBuffer() and getBuffer()', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      var buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      context.putBuffer('key', buf, function(error) {
        if (error) throw error;

        context.getBuffer('key', function(error, result) {
          expect(error).not.to.exist;
          expect(Buffer.isBuffer(result)).to.be.true;
          expect(result).to.deep.equal(buf);
          done();
        });
      });
    });
  });

  it('should allow zero-length Buffers with putBuffer() and getBuffer()', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      // Zero-length Buffer
      var buf = Buffer.alloc(0);
      context.putBuffer('key', buf, function(error) {
        if (error) throw error;

        context.getBuffer('key', function(error, result) {
          expect(error).not.to.exist;
          expect(Buffer.isBuffer(result)).to.be.true;
          expect(result).to.deep.equal(buf);
          done();
        });
      });
    });
  });

  it('should allow delete()', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      context.putObject('key', 'value', function(error) {
        if (error) throw error;

        context.delete('key', function(error) {
          if (error) throw error;

          context.getObject('key', function(error, result) {
            expect(error).not.to.exist;
            expect(result).not.to.exist;
            done();
          });
        });
      });
    });
  });

  it('should allow clear()', function(done) {
    provider.open(function(error) {
      if (error) throw error;

      var context = provider.getReadWriteContext();
      context.putObject('key1', 'value1', function(error) {
        if (error) throw error;

        context.putObject('key2', 'value2', function(error) {
          if (error) throw error;

          context.clear(function(error) {
            if (error) throw error;

            context.getObject('key1', function(error, result) {
              if (error) throw error;
              expect(result).not.to.exist;

              context.getObject('key2', function(error, result) {
                if (error) throw error;
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
