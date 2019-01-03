var Filer = require('../../src');
var expect = require('chai').expect;

describe('Filer', function() {
  it('is defined', function() {
    expect(typeof Filer).not.to.equal(undefined);
  });

  it('has FileSystem constructor', function() {
    expect(typeof Filer.FileSystem).to.equal('function');
  });

  it('has Buffer constructor', function() {
    expect(typeof Filer.Buffer).to.equal('function');
  });

  it('has Path object', function() {
    expect(typeof Filer.Path).to.equal('object');
  });

  it('has Errors object', function() {
    expect(typeof Filer.Errors).to.equal('object');
  });

  it('has an fs object that returns a Filer.FileSystem', function() {
    // Depends on IndexedDB being available, since we can't
    // configure our own test provider.
    if(!Filer.FileSystem.providers.IndexedDB.isSupported()) {
      this.skip();
    }

    expect(typeof Filer.fs).to.equal('object');

    const fs1 = Filer.fs;
    const fs2 = Filer.fs;

    expect(fs1).to.be.an.instanceof(Filer.FileSystem);
    expect(fs2).to.be.an.instanceof(Filer.FileSystem);
    expect(fs1).to.equal(fs2);
  });

  it('has Shell constructor', function() {
    expect(typeof Filer.Shell).to.equal('function');
  });

  it('must honor the \'FORMAT\' flag', function(done) {
    var name = 'local-test';
    // Because we need to use a bunch of Filer filesystems
    // in this test, we can't use the usual test infrastructure
    // to create/manage the fs instance.  Pick the best one
    // based on the testing environment (browser vs. node)
    var providers = Filer.FileSystem.providers;
    var Provider;
    if(providers.IndexedDB.isSupported()) {
      Provider = providers.IndexedDB;
    } else {
      Provider = providers.Memory;
    }

    var fs = new Filer.FileSystem({name, provider: new Provider(name)});
    var fs2 = new Filer.FileSystem({name, provider: new Provider(name)});

    fs.mkdir('/test', function(err){
      if(err) throw err;

      fs2.readdir('/', function(err, list) {
        if(err) throw err;

        expect(list).to.exist;
        expect(list).to.have.length(1);

        fs2 = new Filer.FileSystem({name, provider: new Provider(name), flags:['FORMAT']});
        fs2.readdir('/', function(err, list2) {
          expect(err).to.not.exist;
          expect(list2).to.exist;
          expect(list2).to.have.length(0);
          done();
        });
      });
    });
  });
});
