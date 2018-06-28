var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.find', function() {
  beforeEach(function(done) {
    util.setup(function() {
      var fs = util.fs();
      /**
       * Create a basic fs layout for each test:
       *
       * /
       * --file1
       * --file2
       * --dir1/
       *   --file3
       *   --subdir1/
       * --dir2/
       *   --file4
       */
      fs.writeFile('/file1', 'file1', function(err) {
        if(err) throw err;

        fs.writeFile('/file2', 'file2', function(err) {
          if(err) throw err;

          fs.mkdir('/dir1', function(err) {
            if(err) throw err;

            fs.writeFile('/dir1/file3', 'file3', function(err) {
              if(err) throw err;

              fs.mkdir('/dir1/subdir1', function(err) {
                if(err) throw err;

                fs.mkdir('/dir2', function(err) {
                  if(err) throw err;

                  fs.writeFile('/dir2/file4', 'file4', function(err) {
                    if(err) throw err;

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.find).to.be.a('function');
  });

  it('should fail when path does not exist', function(done) {
    var shell = util.shell();

    shell.find('/no-such-folder', function(err, found) {
      expect(err).to.exist;
      expect(err.code).to.equal('ENOENT');
      expect(found).not.to.exist;
      done();
    });
  });

  it('should fail when path exists but is non-dir', function(done) {
    var shell = util.shell();

    shell.find('/file1', function(err, found) {
      expect(err).to.exist;
      expect(err.code).to.equal('ENOTDIR');
      expect(found).not.to.exist;
      done();
    });
  });

  it('should find all paths in the filesystem with no options', function(done) {
    var shell = util.shell();

    shell.find('/', function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/',
        '/file1',
        '/file2',
        '/dir1/',
        '/dir1/file3',
        '/dir1/subdir1/',
        '/dir2/',
        '/dir2/file4'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });
  });

  it('should get same paths in exec as are found when complete', function(done) {
    var shell = util.shell();
    var pathsSeen = [];

    function processPath(path, next) {
      pathsSeen.push(path);
      next();
    }

    shell.find('/', {exec: processPath}, function(err, found) {
      expect(err).not.to.exist;

      expect(found).to.deep.equal(pathsSeen);
      done();
    });
  });

  it('should return only paths that match a regex pattern', function(done) {
    var shell = util.shell();

    shell.find('/', {regex: /file\d$/}, function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/file1',
        '/file2',
        '/dir1/file3',
        '/dir2/file4'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });    
  });

  it('should append a / to the end of a dir path', function(done) {
    var shell = util.shell();
    var dirsSeen = 0;

    function endsWith(str, suffix) {
      var lastIndex = str.lastIndexOf(suffix);
      return (lastIndex !== -1) && (lastIndex + suffix.length === str.length);
    }

    function processPath(path, next) {
      expect(endsWith(path, '/')).to.be.true;
      dirsSeen++;
      next();
    }

    shell.find('/', {regex: /dir\d$/, exec: processPath}, function(err) {
      expect(err).not.to.exist;
      expect(dirsSeen).to.equal(3);
      done();
    });    
  });

  it('should only look below the specified dir path', function(done) {
    var shell = util.shell();

    shell.find('/dir1', function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/dir1/',
        '/dir1/file3',
        '/dir1/subdir1/'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });    
  });

  it('should allow using options.name to match basename with a pattern', function(done) {
    var shell = util.shell();

    shell.find('/', {name: 'file*'}, function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/file1',
        '/file2',
        '/dir1/file3',
        '/dir2/file4'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });
  });

  it('should allow using options.path to match dirname with a pattern', function(done) {
    var shell = util.shell();

    shell.find('/', {name: '*ir1*'}, function(err, found) {
      expect(err).not.to.exist;

      var expected = [
        '/dir1/',
        '/dir1/subdir1/'
      ];
      expect(found).to.deep.equal(expected);
      done();
    });
  });

});
