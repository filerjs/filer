var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.env', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should get default env options', function() {
    var shell = util.shell();
    expect(shell.env).to.exist;
    expect(shell.env.get('TMP')).to.equal('/tmp');
    expect(shell.env.get('PATH')).to.equal('');
    expect(shell.pwd()).to.equal('/');
  });

  it('should be able to specify env options', function() {
    var options = {
      env: {
        TMP: '/tempdir',
        PATH: '/dir'
      }
    };
    var shell = util.shell(options);
    expect(shell.env).to.exist;
    expect(shell.env.get('TMP')).to.equal('/tempdir');
    expect(shell.env.get('PATH')).to.equal('/dir');
    expect(shell.pwd()).to.equal('/');

    expect(shell.env.get('FOO')).not.to.exist;
    shell.env.set('FOO', 1);
    expect(shell.env.get('FOO')).to.equal(1);
  });

  it('should fail when dirs argument is absent', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    shell.cat(null, function(error, list) {
      expect(error).to.exist;
      expect(error.code).to.equal("EINVAL");
      expect(list).not.to.exist;
      done();
    });
  });

  it('should give new value for shell.pwd() when cwd changes', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      expect(shell.pwd()).to.equal('/');
      shell.cd('/dir', function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/dir');
        done();
      });
    });
  });

  it('should create/return the default tmp dir', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    expect(shell.env.get('TMP')).to.equal('/tmp');
    shell.tempDir(function(err, tmp) {
      expect(err).not.to.exist;
      shell.cd(tmp, function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/tmp');
        done();
      });
    });
  });

  it('should create/return the tmp dir specified in env.TMP', function(done) {
    var fs = util.fs();
    var shell = fs.Shell({
      env: {
        TMP: '/tempdir'
      }
    });

    expect(shell.env.get('TMP')).to.equal('/tempdir');
    shell.tempDir(function(err, tmp) {
      expect(err).not.to.exist;
      shell.cd(tmp, function(err) {
        expect(err).not.to.exist;
        expect(shell.pwd()).to.equal('/tempdir');
        done();
      });
    });
  });

  it('should allow repeated calls to tempDir()', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    expect(shell.env.get('TMP')).to.equal('/tmp');
    shell.tempDir(function(err, tmp) {
      expect(err).not.to.exist;
      expect(tmp).to.equal('/tmp');

      shell.tempDir(function(err, tmp) {
        expect(err).not.to.exist;
        expect(tmp).to.equal('/tmp');
        done();
      });
    });
  });
});
