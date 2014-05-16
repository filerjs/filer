var requirejs = require('requirejs');
//var Mocha = require('mocha');

requirejs.config({
  paths: {
    "tests": "../tests",
    "src": "../src",
    "spec": "../tests/spec",
    "bugs": "../tests/bugs",
    "util": "../tests/lib/test-utils",
    "Filer": "../dist/filer"
  },
  baseUrl: "./lib",
  optimize: "none",
  shim: {
    // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
    // and we use a fake one for reduced size, since we only care about utf8.
    "encoding": {
      deps: ["encoding-indexes-shim"]
    }
//,
//    "mocha": {
//      init: function() {
//        this.mocha = new Mocha();
//        this.mocha.setup("bdd").timeout(5000).slow(250);
//        this.mocha.setup("bdd");
//        GLOBAL.describe = mocha.describe;
//        return this.mocha;
//      }
//    }
  },
  nodeRequire: require
});

GLOBAL.window = GLOBAL;
GLOBAL.expect = require('chai').expect;
console.log('here 1');

  describe("one test", function() {
    it('should work', function(done){
      require('assert').ok(true);
      done();
    });
  });

//requirejs(function() {
  requirejs(["tests/test-manifest"], function() {

console.log('here 2');
//console.dir(mocha);

  describe("two test", function() {
    it('should work', function(done){
      require('assert').ok(true);
      done();
    });
  });

console.log('here 3');

//  mocha.run(function() {
//    console.log('running');
//  });

console.log('here 4');


/**

    mocha.run(function() {
      console.log('here 4');
    }).on('fail', function(test) {
      console.log('fail', test);
    }).on('pass', function(test) {
      console.log('pass', test);
    });
  });

**/
});

//setTimeout(function(){}, 3000);
