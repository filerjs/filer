var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.zip() and unzip()', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.zip).to.be.a('function');
    expect(shell.unzip).to.be.a('function');
  });

  it('should fail when path argument is absent', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();

    shell.unzip(null, function(err) {
      expect(err).to.exist;
      done();
    });
  });

  it('should download and unzip the contents of a zip file', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var url = typeof XMLHttpRequest === "undefined" ? "http://localhost:1234/tests/test-file.txt.zip" : "/tests/test-file.txt.zip";
    var filename = "test-file.txt.zip";
    var contents = "This is a test file used in some of the tests.\n";

    fs.writeFile('/original', contents, function(err) {
      if(err) throw err;

      shell.wget(url, {filename: filename}, function(err, path) {
        if(err) throw err;

        shell.unzip(path, function(err) {
          if(err) throw err;

          fs.readFile('/original', function(err, originalData) {
            if(err) throw err;


            fs.readFile('/test-file.txt', function(err, data) {
              if(err) throw err;
              expect(util.typedArrayEqual(data, originalData)).to.be.true;
              done();
            });
          });
        });
      });
    });
  });

  it('should download and unzip the contents of a zip file with a specified destination', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var Path = Filer.Path;
    var url = typeof XMLHttpRequest === "undefined" ? "http://localhost:1234/tests/test-file.txt.zip" : "/tests/test-file.txt.zip";
    var filename = "test-file.txt.zip";
    var contents = "This is a test file used in some of the tests.\n";

    fs.writeFile('/original', contents, function(err) {
      if(err) throw err;

      shell.wget(url, {filename: filename}, function(err, path) {
        if(err) throw err;

        shell.tempDir(function(err, tmp) {
          if (err) throw err;

          shell.unzip(path, { destination: tmp }, function(err) {
            if(err) throw err;

            fs.readFile('/original', function(err, originalData) {
              if(err) throw err;

              fs.readFile(Path.join(tmp, 'test-file.txt'), function(err, data) {
                if(err) throw err;
                expect(util.typedArrayEqual(data, originalData)).to.be.true;
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should be able to zip and unzip a file', function(done) {
    var fs = util.fs();
    var file = '/test-file.txt';
    var zipfile = file + '.zip';
    var shell = fs.Shell();
    var Path = Filer.Path;
    var contents = "This is a test file used in some of the tests.\n";

    fs.writeFile(file, contents, function(err) {
      if(err) throw err;

      shell.zip(zipfile, file, function(err) {
        if(err) throw err;

        fs.stat(zipfile, function(err, stats) {
          if(err) throw err;
          expect(stats.isFile()).to.be.true;

          shell.rm(file, function(err) {
            if(err) throw err;

            shell.unzip(zipfile, function(err) {
              if(err) throw err;

              fs.stat(file, function(err, stats) {
                if(err) throw err;
                expect(stats.isFile()).to.be.true;

                fs.readFile(Path.join('/', file), 'utf8', function(err, data) {
                  if(err) throw err;
                  expect(data).to.equal(contents);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should be able to handle a deep tree structure in a zip', function(done) {
    // test-dir.zip has the following structure:
    //
    // test-dir/
    // ├── test-dir2
    // │   └── test-file.txt
    // ├── test-file.txt
    // └── test-file2.txt

    var fs = util.fs();
    var shell = fs.Shell();
    var url = typeof XMLHttpRequest === "undefined" ? "http://localhost:1234/tests/test-dir.zip" : "/tests/test-dir.zip";
    var filename = "test-dir.zip";
    var Path = Filer.Path;
    var contents = "This is a test file used in some of the tests.\n";

    function confirmFile(filename, callback) {
      filename = Path.join('/', filename);
      fs.readFile(filename, 'utf8', function(err, data) {
        if(err) {
          console.error('Expected ' + filename + ' to exist.');
          expect(false).to.be.true;
          return callback(err);
        }
        expect(data).to.equal(contents);
        callback();
      });
    }

    function confirmDir(dirname, callback) {
      dirname = Path.join('/', dirname);
      fs.stat(dirname, function(err, stats) {
        if(err) {
          console.error('Expected ' + dirname + ' to exist.');
          expect(false).to.be.true;
          return callback(err);
        }
        expect(stats.isDirectory()).to.be.true;
        callback();
      });
    }

    shell.wget(url, {filename: filename}, function(err, path) {
      if(err) throw err;

      shell.unzip(path, function(err) {
        if(err) throw err;

        // Forgive the crazy indenting, trying to match tree structure ;)
        confirmDir('test-dir', function() {
          confirmDir('test-dir/test-dir2', function() {
            confirmFile('test-dir/test-dir2/test-file.txt', function() {
         confirmFile('test-dir/test-file.txt', function() {
         confirmFile('test-dir/test-file2.txt', function() {
           done();
         });});});});});
      });
    });
  });

  it('should be able to re-create (unzip/zip) a deep tree structure in a zip', function(done) {
    // test-dir.zip has the following structure:
    //
    // test-dir/
    // ├── test-dir2
    // │   └── test-file.txt
    // ├── test-file.txt
    // └── test-file2.txt

    var fs = util.fs();
    var shell = fs.Shell();
    var url = typeof XMLHttpRequest === "undefined" ? "http://localhost:1234/tests/test-dir.zip" : "/tests/test-dir.zip";
    var filename = "test-dir.zip";
    var Path = Filer.Path;
    var contents = "This is a test file used in some of the tests.\n";

    function confirmFile(filename, callback) {
      filename = Path.join('/unzipped', filename);
      fs.readFile(filename, 'utf8', function(err, data) {
        if(err) {
          console.error('Expected ' + filename + ' to exist.');
          expect(false).to.be.true;
          return callback(err);
        }
        expect(data).to.equal(contents);
        callback();
      });
    }

    function confirmDir(dirname, callback) {
      dirname = Path.join('/unzipped', dirname);
      fs.stat(dirname, function(err, stats) {
        if(err) {
          console.error('Expected ' + dirname + ' to exist.');
          expect(false).to.be.true;
          return callback(err);
        }
        expect(stats.isDirectory()).to.be.true;
        callback();
      });
    }

    shell.wget(url, {filename: filename}, function(err, path) {
      if(err) throw err;

      shell.unzip(path, function(err) {
        if(err) throw err;

        shell.zip('/test-dir2.zip', '/test-dir', { recursive: true }, function(err) {
          if(err) throw err;

          shell.mkdirp('/unzipped', function(err) {
            if(err) throw err;

            shell.unzip('/test-dir2.zip', { destination: '/unzipped' }, function(err) {
              if(err) throw err;

              // Forgive the crazy indenting, trying to match tree structure ;)
              confirmDir('test-dir', function() {
                confirmDir('test-dir/test-dir2', function() {
                  confirmFile('test-dir/test-dir2/test-file.txt', function() {
                  confirmFile('test-dir/test-file.txt', function() {
                  confirmFile('test-dir/test-file2.txt', function() {
                    done();
              });});});});});

            });
          });
        });
      });
    });
  });

  it('should fail if the zipfile already exists', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var file = "/file";
    var zipfile = "/zipfile.zip";
    var contents = "This is a test file used in some of the tests.\n";

    fs.writeFile(file, contents, function(err) {
      if(err) throw err;

      shell.zip(zipfile, file, function(err) {
        if(err) throw err;
        shell.zip(zipfile, file, function(err) {
          expect(err).to.exist;
          expect(err.code).to.equal('EEXIST');
          done();
        });
      });
    });
  });
});
