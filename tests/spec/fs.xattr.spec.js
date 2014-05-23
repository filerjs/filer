var Filer = require('../..');
var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.xattr', function() {
  beforeEach(util.setup);
  afterEach(util.cleanup);

  it('should be a function', function () {
    var fs = util.fs();
    expect(fs.setxattr).to.be.a('function');
    expect(fs.getxattr).to.be.a('function');
    expect(fs.removexattr).to.be.a('function');
    expect(fs.fsetxattr).to.be.a('function');
    expect(fs.fgetxattr).to.be.a('function');
  });

  it('should error when setting with a name that is not a string', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 89, 'testvalue', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when setting with a name that is null', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', null, 'testvalue', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when setting with an invalid flag', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', 'InvalidFlag', function (error) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when when setting an extended attribute which exists with XATTR_CREATE flag', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', function(error) {
        if (error) throw error;

        fs.setxattr('/testfile', 'test', 'othervalue', 'CREATE', function(error) {
          expect(error).to.exist;
          expect(error.code).to.equal('EEXIST');
          done();
        });
      });
    });
  });

  it('should error when setting an extended attribute which does not exist with XATTR_REPLACE flag', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', 'REPLACE', function(error) {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOATTR');
        done();
      });
    });
  });

  it('should error when getting an attribute with a name that is empty', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.getxattr('/testfile', '', function(error, value) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when getting an attribute where the name is not a string', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.getxattr('/testfile', 89, function(error, value) {
        expect(error).to.exist;
        expect(error.code).to.equal('EINVAL');
        done();
      });
    });
  });

  it('should error when getting an attribute that does not exist', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function(error) {
      if (error) throw error;

      fs.getxattr('/testfile', 'test', function(error, value) {
        expect(error).to.exist;
        expect(error.code).to.equal('ENOATTR');
        done();
      });
    });
  });

  it('should error when file descriptor is invalid', function(done) {
    var fs = util.fs();
    var completeSet, completeGet, completeRemove;
    var _value;

    completeSet = completeGet = completeRemove = false;

    function maybeDone() {
      if(completeSet && completeGet && completeRemove) {
        done();
      }
    }

    fs.fsetxattr(1, 'test', 'value', function(error) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      completeSet = true;
      maybeDone();
    });

    fs.fgetxattr(1, 'test', function(error, value) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      expect(value).not.to.exist;
      completeGet = true;
      maybeDone();
    });

    fs.fremovexattr(1, 'test', function(error, value) {
      expect(error).to.exist;
      expect(error.code).to.equal('EBADF');
      completeRemove = true;
      maybeDone();
    });
  });

  it('should set and get an extended attribute of a path', function(done) {
    var fs = util.fs();
    var name = 'test';

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', name, 'somevalue', function(error) {
        expect(error).not.to.exist;

        fs.getxattr('/testfile', name, function(error, value) {
          expect(error).not.to.exist;
          expect(value).to.equal('somevalue');
          done();
        });
      });
    });
  });

  it('should error when attempting to remove a non-existing attribute', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', '', function (error) {
        if (error) throw error;

        fs.removexattr('/testfile', 'testenoattr', function (error) {
          expect(error).to.exist;
          expect(error.code).to.equal('ENOATTR');
          done();
        });
      });
    });
  });

  it('should set and get an empty string as a value', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', '', function (error) {
        if(error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.equal('');
          done();
        });
      });
    });
  });

  it('should set and get an extended attribute for a valid file descriptor', function(done) {
    var fs = util.fs();

    fs.open('/testfile', 'w', function (error, ofd) {
      if (error) throw error;

      fs.fsetxattr(ofd, 'test', 'value', function (error) {
        expect(error).not.to.exist;

        fs.fgetxattr(ofd, 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.equal('value');
          done();
        });
      });
    });
  });

  it('should set and get an object to an extended attribute', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', { key1: 'test', key2: 'value', key3: 87 }, function (error) {
        if(error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.deep.equal({ key1: 'test', key2: 'value', key3: 87 });
          done();
        });
      });
    });
  });

  it('should update/overwrite an existing extended attribute', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'value', function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          if (error) throw error;
          expect(value).to.equal('value');

          fs.setxattr('/testfile', 'test', { o: 'object', t: 'test' }, function (error) {
            if (error) throw error;

            fs.getxattr('/testfile', 'test', function (error, value) {
              if (error) throw error;
              expect(value).to.deep.equal({ o: 'object', t: 'test' });

              fs.setxattr('/testfile', 'test', 100, 'REPLACE', function (error) {
                if (error) throw error;

                fs.getxattr('/testfile', 'test', function (error, value) {
                  expect(value).to.equal(100);
                  done();
                });
              });
            });
          });
        });
      })
    });
  });

  it('should set multiple extended attributes for a path', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 89, function (error) {
        if (error) throw error;

        fs.setxattr('/testfile', 'other', 'attribute', function (error) {
          if(error) throw error;

          fs.getxattr('/testfile', 'test', function (error, value) {
            if(error) throw error;
            expect(value).to.equal(89);

            fs.getxattr('/testfile', 'other', function (error, value) {
              expect(error).not.to.exist;
              expect(value).to.equal('attribute');
              done();
            });
          });
        });
      });
    });
  });

  it('should remove an extended attribute from a path', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', 'somevalue', function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          if (error) throw error;
          expect(value).to.equal('somevalue');

          fs.removexattr('/testfile', 'test', function (error) {
            if (error) throw error;

            fs.getxattr('/testfile', 'test', function (error) {
              expect(error).to.exist;
              expect(error.code).to.equal('ENOATTR');
              done();
            });
          });
        });
      });
    });
  });

  it('should remove an extended attribute from a valid file descriptor', function(done) {
    var fs = util.fs();

    fs.open('/testfile', 'w', function (error, ofd) {
      if (error) throw error;

      fs.fsetxattr(ofd, 'test', 'somevalue', function (error) {
        if (error) throw error;

        fs.fgetxattr(ofd, 'test', function (error, value) {
          if (error) throw error;
          expect(value).to.equal('somevalue');

          fs.fremovexattr(ofd, 'test', function (error) {
            if (error) throw error;

            fs.fgetxattr(ofd, 'test', function (error) {
              expect(error).to.exist;
              expect(error.code).to.equal('ENOATTR');
              done();
            });
          });
        });
      });
    });
  });

  it('should allow setting with a null value', function(done) {
    var fs = util.fs();

    fs.writeFile('/testfile', '', function (error) {
      if (error) throw error;

      fs.setxattr('/testfile', 'test', null, function (error) {
        if (error) throw error;

        fs.getxattr('/testfile', 'test', function (error, value) {
          expect(error).not.to.exist;
          expect(value).to.be.null;
          done();
        });
      });
    });
  });
});
