var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var setImmediate = require('../../lib/async.js').setImmediate;

describe('Queued operations should error when fs is in error state, issue 258', function() {
  var provider;

  // Provider that does nothing but fail on open.
  function FailingProviderContext(){}
  FailingProviderContext.prototype.clear = function(callback) {
    this.failCallback(callback);
  };
  FailingProviderContext.prototype.getObject =
  FailingProviderContext.prototype.getBuffer = function(key, callback) {
    this.failCallback(callback);
  };
  FailingProviderContext.prototype.putObject =
  FailingProviderContext.prototype.putBuffer = function(key, value, callback) {
    this.failCallback(callback);
  };
  FailingProviderContext.prototype.delete = function(key, callback) {
    this.failCallback(callback);
  };

  function FailingProvider() {
    var self = this;
    self.name = 'failure';
    self.open = function(callback) {
      // Wait until caller tells us to fail
      self.failNow = function() {
        self.failCallback(callback);
      };
    };
    self.failCallback = function(callback) {
      setImmediate(function() {
        callback(new Error);
      });
    };
  }
  FailingProvider.prototype.getReadWriteContext =
  FailingProvider.prototype.getReadWriteContext = function() {
    return new FailingProviderContext();
  };

  beforeEach(function() {
    provider = new FailingProvider();
  });

  afterEach(function() {
    provider = null;
  });

  it('should get EFILESYSTEMERROR errors on callbacks to queued operations on provider error', function(done) {
    var errCount = 0;
    var fs = new Filer.FileSystem({provider: provider});

    function maybeDone(err) {
      expect(err).to.exist;
      expect(err.code).to.equal('EFILESYSTEMERROR');
      errCount++;

      if(errCount === 2) {
        done();
      }
    }

    // Queue some fs operations, and expect them to fail
    fs.mkdir('/tmp', maybeDone);
    fs.writeFile('/file', 'data', maybeDone);

    // Operations are queued, tell the provider to fail now.
    provider.failNow();
  });

  it('should get EFILESYSTEMERROR errors on callbacks to queued operations after ready callback', function(done) {
    var fs = new Filer.FileSystem({provider: provider}, function(err) {
      expect(err).to.exist;

      // Queue is drained, but new operations should also fail
      fs.mkdir('/tmp', function(err) {
        expect(err).to.exist;
        expect(err.code).to.equal('EFILESYSTEMERROR');
        done();
      });
    });
    provider.failNow();
  });
});
