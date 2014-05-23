var Filer = require('../../..');
var util = require('../../lib/test-utils.js');
var expect = require('chai').expect;

describe('FileSystemShell.ls', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function() {
    var shell = util.shell();
    expect(shell.ls).to.be.a('function');
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

  it('should return the contents of a simple dir', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "a";
    var contents2 = "bb";

    fs.writeFile('/file', contents, function(err) {
      if(err) throw err;

      fs.writeFile('/file2', contents2, function(err) {
        if(err) throw err;

        shell.ls('/', function(err, list) {
          expect(err).not.to.exist;
          expect(list.length).to.equal(2);

          var item0 = list[0];
          expect(item0.path).to.equal('file');
          expect(item0.links).to.equal(1);
          expect(item0.size).to.equal(1);
          expect(item0.modified).to.be.a('number');
          expect(item0.type).to.equal('FILE');
          expect(item0.contents).not.to.exist;

          var item1 = list[1];
          expect(item1.path).to.equal('file2');
          expect(item1.links).to.equal(1);
          expect(item1.size).to.equal(2);
          expect(item1.modified).to.be.a('number');
          expect(item1.type).to.equal('FILE');
          expect(item0.contents).not.to.exist;

          done();
        });
      });
    });
  });

  it('should return the shallow contents of a dir tree', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.mkdir('/dir/dir2', function(err) {
        if(err) throw err;

        fs.writeFile('/dir/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir/file2', contents, function(err) {
            if(err) throw err;

            shell.ls('/dir', function(err, list) {
              expect(err).not.to.exist;
              expect(list.length).to.equal(3);

              // We shouldn't rely on the order we'll get the listing
              list.forEach(function(item, i, arr) {
                switch(item.path) {
                case 'dir2':
                  expect(item.links).to.equal(1);
                  expect(item.size).to.be.a('number');
                  expect(item.modified).to.be.a('number');
                  expect(item.type).to.equal('DIRECTORY');
                  expect(item.contents).not.to.exist;
                  break;
                case 'file':
                case 'file2':
                  expect(item.links).to.equal(1);
                  expect(item.size).to.equal(1);
                  expect(item.modified).to.be.a('number');
                  expect(item.type).to.equal('FILE');
                  expect(item.contents).not.to.exist;
                  break;
                default:
                  // shouldn't happen
                  expect(true).to.be.false;
                  break;
                }

                if(i === arr.length -1) {
                  done();
                }
              });
            });
          });
        });
      });
    });
  });

  it('should return the deep contents of a dir tree', function(done) {
    var fs = util.fs();
    var shell = fs.Shell();
    var contents = "a";

    fs.mkdir('/dir', function(err) {
      if(err) throw err;

      fs.mkdir('/dir/dir2', function(err) {
        if(err) throw err;

        fs.writeFile('/dir/dir2/file', contents, function(err) {
          if(err) throw err;

          fs.writeFile('/dir/file', contents, function(err) {
            if(err) throw err;

            fs.writeFile('/dir/file2', contents, function(err) {
              if(err) throw err;

              shell.ls('/dir', { recursive: true }, function(err, list) {
                expect(err).not.to.exist;
                expect(list.length).to.equal(3);

                // We shouldn't rely on the order we'll get the listing
                list.forEach(function(item, i, arr) {
                  switch(item.path) {
                  case 'dir2':
                    expect(item.links).to.equal(1);
                    expect(item.size).to.be.a('number');
                    expect(item.modified).to.be.a('number');
                    expect(item.type).to.equal('DIRECTORY');
                    expect(item.contents).to.exist;
                    expect(item.contents.length).to.equal(1);
                    var contents0 = item.contents[0];
                    expect(contents0.path).to.equal('file');
                    expect(contents0.links).to.equal(1);
                    expect(contents0.size).to.equal(1);
                    expect(contents0.modified).to.be.a('number');
                    expect(contents0.type).to.equal('FILE');
                    expect(contents0.contents).not.to.exist;
                    break;
                  case 'file':
                  case 'file2':
                    expect(item.links).to.equal(1);
                    expect(item.size).to.equal(1);
                    expect(item.modified).to.be.a('number');
                    expect(item.type).to.equal('FILE');
                    expect(item.contents).not.to.exist;
                    break;
                  default:
                    // shouldn't happen
                    expect(true).to.be.false;
                    break;
                  }

                  if(i === arr.length -1) {
                    done();
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});
