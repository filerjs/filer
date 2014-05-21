define(['../../src/network'], function(network) {

  describe('Network download tool', function() {
    var uri;

    if (typeof XMLHttpRequest === 'undefined') {
      // Node context
      uri = {
        valid: 'http://localhost:1234/package.json',
        invalid: 'booyah!',
        notFound: 'http://localhost:1234/this-isnt-real'
      }
    } else {
      // Browser context
      uri = {
        valid: '../package.json',
        invalid: 'asdf://booyah!',
        notFound: 'this-isnt-real'
      };
    }

    it('should throw an exception when a URI is not passed', function(done) {
      expect(function() {
        network.download(undefined, function(error, data) {});
      }).to.throwError;
      done();
    });

    it('should get an error when a non-existent path is specified', function(done) {
      network.download(uri.notFound, function(error, data) {
        expect(error).to.exist;
        expect(error.code).to.eql(404);
        expect(data).to.be.eql(null);
        done();
      });
    });

    if (typeof XMLHttpRequest === 'undefined') {
      it('in nodejs, should get an error when an invalid URI is specified', function(done) {
        network.download(uri.invalid, function(error, data) {
          expect(error).to.exist;
          expect(error.code).to.eql(null);
          expect(error.message).to.exist;
          expect(data).to.be.eql(null);
          done();
        });
      });
    } else {
      it('in a browser, should throw an error when an invalid URI is specified', function(done) {
        expect(function(){
          network.download(uri.invalid, function() {});
        }).to.throwError;
        done();
      });
    }

    it('should download a resource from the server', function(done) {
      network.download(uri.valid, function(error, data) {
        expect(error).not.to.exist;
        expect(data).to.exist;
        expect(data).to.have.length.above(0);
        done();
      });
    });
  });
});
