var Filer = require('../../src');
var expect = require('chai').expect;

describe('Filer', function() {
  it('is defined', function() {
    expect(typeof Filer).not.to.equal(undefined);
  });

  it('has FileSystem constructor', function() {
    expect(typeof Filer.FileSystem).to.equal('function');
  });

  it('has Shell constructor', function() {
    expect(typeof Filer.Shell).to.equal('function');
  });

  it('must honor the \'FORMAT\' flag', function(done) {
    var fs = new Filer.FileSystem({name: 'local-test'});
    var fs2 = new Filer.FileSystem({name: 'local-test'});

    fs.mkdir('/test', function(err){
      if(err) throw err;

      fs2.readdir('/', function(err, list) {
        if(err) throw err;

        expect(list).to.exist;
        expect(list).to.have.length(1);

        fs2 = new Filer.FileSystem({name: 'local-test', flags:['FORMAT']});
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
