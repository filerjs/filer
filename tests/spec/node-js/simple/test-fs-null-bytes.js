define(["Filer"], function(Filer) {

  describe("node.js tests: https://github.com/joyent/node/blob/master/test/simple/test-fs-null-bytes.js", function() {

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

    it('should reject paths with null bytes in them', function() {
      var complete = false;
      var checks = [];
      var fnCount = 0;
      var fnTotal = 16;
      var expected = "Path must be a string without null bytes.";
      var fs = this.fs;

      // Make sure function fails with null path error in callback.
      function check(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        args = args.concat(function(err) {
          checks.push(function(){
            expect(err).toBeDefined();
            expect(err.message).toEqual(expected);
          });
          fnCount++;
          complete = fnCount === fnTotal;
        });

        fn.apply(fs, args);
      }

      check(fs.link,        'foo\u0000bar', 'foobar');
      check(fs.link,        'foobar', 'foo\u0000bar');
      check(fs.lstat,       'foo\u0000bar');
      check(fs.mkdir,       'foo\u0000bar', '0755');
      check(fs.open,        'foo\u0000bar', 'r');
      check(fs.readFile,    'foo\u0000bar');
      check(fs.readdir,     'foo\u0000bar');
      check(fs.readlink,    'foo\u0000bar');
      check(fs.rename,      'foo\u0000bar', 'foobar');
      check(fs.rename,      'foobar', 'foo\u0000bar');
      check(fs.rmdir,       'foo\u0000bar');
      check(fs.stat,        'foo\u0000bar');
      check(fs.symlink,     'foo\u0000bar', 'foobar');
      check(fs.symlink,     'foobar', 'foo\u0000bar');
      check(fs.unlink,      'foo\u0000bar');
      check(fs.writeFile,   'foo\u0000bar');
      // TODO - need to be implemented still...
      //  check(fs.appendFile,  'foo\u0000bar');
      //  check(fs.realpath,    'foo\u0000bar');
      //  check(fs.chmod,       'foo\u0000bar', '0644');
      //  check(fs.chown,       'foo\u0000bar', 12, 34);
      //  check(fs.realpath,    'foo\u0000bar');
      //  check(fs.truncate,    'foo\u0000bar');
      //  check(fs.utimes,      'foo\u0000bar', 0, 0);

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        checks.forEach(function(fn){
          fn();
        });
      });
    });
  });
});