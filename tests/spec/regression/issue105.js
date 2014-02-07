define(["Filer"], function(Filer) {

 describe('trailing slashes in path names, issue 105', function() {
    beforeEach(function() {
      this.db_name = mk_db_name();
      this.fs = new Filer.FileSystem({
        name: this.db_name,
        flags: 'FORMAT'
      });
    });

    afterEach(function() {
      indexedDB.deleteDatabase(this.db_name);
      delete this.fs;
    });

    it('should deal with trailing slashes properly, path == path/', function() {
      var complete = false;
      var _result1, _result2;
      var fs = this.fs;

      fs.mkdir('/tmp', function(err) {
        if(err) throw err;

        fs.mkdir('/tmp/foo', function(err) {
          if(err) throw err;

          // Without trailing slash
          fs.readdir('/tmp', function(err, result1) {
            if(err) throw err;
            _result1 = result1;

            // With trailing slash
            fs.readdir('/tmp/', function(err, result2) {
              if(err) throw err;
              _result2 = result2;

              complete = true;
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result1.length).toEqual(1);
        expect(_result2[0]).toEqual('tmp');
        expect(_result1).toEqual(_result2);
      });
    });
  });
});
