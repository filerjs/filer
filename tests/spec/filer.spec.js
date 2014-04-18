define(["Filer"], function(Filer) {

  describe("Filer", function() {
    it("is defined", function() {
      expect(typeof Filer).not.to.equal(undefined);
    });

    it("has FileSystem constructor", function() {
      expect(typeof Filer.FileSystem).to.equal('function');
    });

    it("must honor the \'FORMAT\' flag", function(done) {
      var fs = new Filer.FileSystem({name: 'local'});
	  var fs2 = new Filer.FileSystem({name: 'local'});
	  fs.mkdir('/test', function(err){
	    fs2.readdir('/', function(err, list){
	      expect(list).to.exist;
	      expect(list).to.have.length(1);
		  fs2 = new Filer.FileSystem({name: 'local', flags:['FORMAT']});
		  fs2.readdir('/', function(err, list2){
		    expect(err).to.not.exist;
		    expect(list2).to.exist;
		    expect(list2).to.have.length(0);
		    done();
		  });
	    });
	  });
    });

  });
});
