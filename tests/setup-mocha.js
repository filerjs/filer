var mocha = require('mocha');

mocha.setup('bdd').timeout(10000).slow(250);

window.onload = function() {
    mocha.checkLeaks();
    mocha.run();
};
