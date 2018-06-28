var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('sh.cd doesn\'t seem to be working from a relative path if I am one or more folders deep, #247', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should properly deal with relative paths missing ./ and ../', function(done) {
    var fs = util.fs();
    var sh = new fs.Shell();

    sh.mkdirp('/home/scott', function(err) {
      if(err) throw err;

      sh.cd('/', function(err) {
        if(err) throw err;

        expect(sh.pwd()).to.equal('/');

        sh.cd('home', function(err) {
          if(err) throw err;

          expect(sh.pwd()).to.equal('/home');

          sh.cd('scott', function(err) {
            if(err) throw err;

            expect(sh.pwd()).to.equal('/home/scott');
            done();
          });
        });
      });
    });
  });
});
