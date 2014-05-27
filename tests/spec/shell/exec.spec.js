var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.exec', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.exec).to.be.a('function');
  });

  it('should be able to execute a command .js file from the filesystem', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var cmdString = "fs.writeFile(args[0], args[1], callback);";

    fs.writeFile('/cmd.js', cmdString, function(error) {
      if(error) throw error;

      shell.exec('/cmd.js', ['/test', 'hello world'], function(error, result) {
        if(error) throw error;

        fs.readFile('/test', 'utf8', function(error, data) {
          if(error) throw error;
          expect(data).to.equal('hello world');
          done();
        });
      });
    });
  });
});
