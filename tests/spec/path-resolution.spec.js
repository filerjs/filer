define(["Filer"], function(Filer) {

  describe('path resolution', function() {
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

    it('should follow a symbolic link to the root directory', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.symlink('/', '/mydirectorylink', function(error) {
        if(error) throw error;

        that.fs.stat('/', function(error, result) {
          if(error) throw error;

            _node = result['node'];
            that.fs.stat('/mydirectorylink', function(error, result) {
              _error = error;
              _result = result;
              complete = true;
            });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_node).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toEqual(_node);
      });
    });

    it('should follow a symbolic link to a directory', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.mkdir('/mydir', function(error) {
        that.fs.symlink('/mydir', '/mydirectorylink', function(error) {
          if(error) throw error;

          that.fs.stat('/mydir', function(error, result) {
            if(error) throw error;

              _node = result['node'];
              that.fs.stat('/mydirectorylink', function(error, result) {
                _error = error;
                _result = result;
                complete = true;
              });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_node).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toEqual(_node);
      });
    });

    it('should follow a symbolic link to a file', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;
        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;
          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _node = result['node'];
            that.fs.symlink('/myfile', '/myfilelink', function(error) {
              if(error) throw error;

              that.fs.stat('/myfilelink', function(error, result) {
                _error = error;
                _result = result;
                complete = true;
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_node).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toEqual(_node);
      });
    });

    it('should follow multiple symbolic links to a file', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;
        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;
          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _node = result['node'];
            that.fs.symlink('/myfile', '/myfilelink1', function(error) {
              if(error) throw error;
              that.fs.symlink('/myfilelink1', '/myfilelink2', function(error) {
                if(error) throw error;

                that.fs.stat('/myfilelink2', function(error, result) {
                  _error = error;
                  _result = result;
                  complete = true;
                });
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_node).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toEqual(_node);
      });
    });

    it('should error if symbolic link leads to itself', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.symlink('/mylink1', '/mylink2', function(error) {
        if(error) throw error;

        that.fs.symlink('/mylink2', '/mylink1', function(error) {
          if(error) throw error;

          that.fs.stat('/myfilelink1', function(error, result) {
            _error = error;
            _result = result;
            complete = true;
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_result).not.toBeDefined();
      });
    });

    it('should error if it follows more than 10 symbolic links', function() {
      var complete = false;
      var _error, _result;
      var that = this;
      var nlinks = 11;

      function createSymlinkChain(n, callback) {
        if(n > nlinks) {
          return callback();
        }

        that.fs.symlink('/myfile' + (n-1), '/myfile' + n, createSymlinkChain.bind(this, n+1, callback));
      }

      that.fs.open('/myfile0', 'w', function(error, result) {
        if(error) throw error;
        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;
          that.fs.stat('/myfile0', function(error, result) {
            if(error) throw error;

            createSymlinkChain(1, function() {
              that.fs.stat('/myfile11', function(error, result) {
                _error = error;
                _result = result;
                complete = true;
              });
            });

          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).not.toBeDefined();
        expect(_error).toBeDefined();
        expect(_error.name).toEqual('ELoop');
      });
    });

    it('should follow a symbolic link in the path to a file', function() {
      var complete = false;
      var _error, _node, _result;
      var that = this;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;
        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;
          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            _node = result['node'];
            that.fs.symlink('/', '/mydirlink', function(error) {
              if(error) throw error;

              that.fs.stat('/mydirlink/myfile', function(error, result) {
                _error = error;
                _result = result;
                complete = true;
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_result).toBeDefined();
        expect(_node).toBeDefined();
        expect(_error).toEqual(null);
        expect(_result['node']).toEqual(_node);
      });
    });

    it('should error if a symbolic link in the path to a file is itself a file', function() {
      var complete = false;
      var _error, _result;
      var that = this;

      that.fs.open('/myfile', 'w', function(error, result) {
        if(error) throw error;
        var fd = result;
        that.fs.close(fd, function(error) {
          if(error) throw error;
          that.fs.stat('/myfile', function(error, result) {
            if(error) throw error;

            that.fs.open('/myfile2', 'w', function(error, result) {
              if(error) throw error;
              var fd = result;
              that.fs.close(fd, function(error) {
                if(error) throw error;
                that.fs.symlink('/myfile2', '/mynotdirlink', function(error) {
                  if(error) throw error;

                  that.fs.stat('/mynotdirlink/myfile', function(error, result) {
                    _error = error;
                    _result = result;
                    complete = true;
                  });
                });
              });
            });
          });
        });
      });

      waitsFor(function() {
        return complete;
      }, 'test to complete', DEFAULT_TIMEOUT);

      runs(function() {
        expect(_error).toBeDefined();
        expect(_result).not.toBeDefined();
      });
    });
  });

});
