define(['../../src/network'], function(network) {

  describe('Network download tool', function() {
    if(typeof XMLHttpRequest === "undefined") {
      it('should connect to server',function(done) {
        var request = require('request');
        request({
          url: 'http://localhost:8080/package.json',
          method: 'GET',
          encoding: 'utf-8'
        }, function(error, msg, body) {
          expect(error).not.to.exist;
          done();
        });
      });
    }

    it('should throw an exception when a URI is not passed', function(done) {
      expect(function() {
        network.download(undefined, function(error, data, statusCode) {});
      }).to.throwError;
      done();
    });

    it('should get an error when a non-existent path is specified', function(done) {
      network.download('http://localhost:8080/file-non-existent', function(error, data, statusCode) {
        expect(error).not.to.exist;
        expect(statusCode).to.eql('404');
        expect(data).to.be.a(null);
        done();
      });
    });

    it('should download a resource from the server', function(done) {
      network.download('http://localhost:8080/package.json', function(error, data, statusCode) {
        expect(error).not.to.exist;
        expect(statusCode).to.eql('200');
        expect(data).to.exist;
        expect(data).to.have.length.above(0);
        done();
      });
    });
  });
});
