var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;
var fsCommands = require('../../src/filesystem/commands');

describe("Filer.FileSystemShell", function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  fsCommands.forEach(function(command){
    it('should properly expose the bound FileSystem\'s ' + command + ' method', function(done){
      var fs = util.fs();
      var shell = new fs.Shell();

      expect(shell[command]).to.be.a('function');
      done();
    })
  });
});
