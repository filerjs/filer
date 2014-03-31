define(["Filer", "util"], function(Filer, util) {

  describe('FileSystemShell.rsync', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.rsync).to.be.a('function');
    });

    it('should fail without a source path provided (null)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.rsync(null, '/', function(err) {  
          expect(err).to.exist;
          expect(err.code).to.equal('EINVAL');
          done();
      });
    });

    it('should fail without a source path provided (\'\')', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.rsync('', '/', function(err) {
          expect(err).to.exist;
          expect(err.code).to.equal('EINVAL');
          done();
      });
    });

    it('should fail with root provided (\'/\')', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.rsync('/', '/', function(err) {
          expect(err).to.exist;
          expect(err.code).to.equal('EINVAL');
          done();
      });
    });

    it('should fail with a non-existant path', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
        shell.rsync('/1.txt', '/', function(err) {
            expect(err).to.exist;
            expect(err.code).to.equal('ENOENT');
            done();
        });
    });

    it('should succeed if the source file is different in content but not length from the destination file. (Destination edited)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt','This is my file. It does not have any typos.','utf8',function(err) { 
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt','This iz mi fiel. It doez not have any topos,', 'utf8', function(err) {
            expect(err).to.not.exist;
            shell.rsync('/1.txt', '/test', { size: 5 }, function(err) {
              expect(err).to.not.exist;
              fs.readFile('/test/1.txt', 'utf8', function(err, data) {
                expect(err).to.not.exist;
                expect(data).to.exist;
                expect(data).to.equal('This is my file. It does not have any typos.');
                done();
              });
            });
          }); 
        });   
      });
    });

    it('should succeed if the source file is longer than the destination file. (Destination appended)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt','This is my file. It is longer than the destination file.', 'utf8', function(err) { 
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt','This is my file.','utf8',function(err) {
            expect(err).to.not.exist;
            shell.rsync('/1.txt', '/test', { size: 5 }, function(err) {
              expect(err).to.not.exist;
              fs.readFile('/test/1.txt', 'utf8', function(err, data){
                expect(err).to.not.exist;
                expect(data).to.exist;
                expect(data).to.equal('This is my file. It is longer than the destination file.');
                done();
              });
            });
          }); 
        });   
      });
    });

    it('should succeed if the source file shorter than the destination file. (Destination truncated)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt','This is my file.','utf8',function(err) { 
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt','This is my file. It is longer than the source version.', 'utf8', function(err) {
            expect(err).to.not.exist;
            shell.rsync('/1.txt', '/test', { size: 5 }, function(err) {
              expect(err).to.not.exist;
              fs.readFile('/test/1.txt', 'utf8', function(err, data){
                expect(err).to.not.exist;
                expect(data).to.exist;
                expect(data).to.equal('This is my file.');
                done();
              });
            });
          }); 
        });   
      });
    });

    it('should succeed if the source file does not exist in the destination folder (Destination file created)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt','This is my file. It does not exist in the destination folder.', 'utf8', function(err) { 
          expect(err).to.not.exist;
          shell.rsync('/1.txt', '/test', { size: 5 }, function(err) {
            expect(err).to.not.exist;
            fs.readFile('/test/1.txt', 'utf8', function(err, data){
              expect(err).to.not.exist;
              expect(data).to.exist;
              expect(data).to.equal('This is my file. It does not exist in the destination folder.');
              done();
            });
          }); 
        });   
      });
    });

    it('should succeed if no options are provided', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt','This is my file. It does not exist in the destination folder.', 'utf8', function(err) { 
          expect(err).to.not.exist;
          shell.rsync('/1.txt', '/test', function(err) {
            expect(err).to.not.exist;
            fs.readFile('/test/1.txt', 'utf8', function(err, data){
              expect(err).to.not.exist;
              expect(data).to.exist;
              expect(data).to.equal('This is my file. It does not exist in the destination folder.');
              done();
            });
          }); 
        });   
      });
    });

    it('should do nothing if the source file and destination file have the same mtime and size with \'checksum = false\' flag (Default)', function(done){
      var fs = util.fs();
      var shell = fs.Shell();
      var date = Date.parse('1 Oct 2000 15:33:22'); 
      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt', 'This is a file.', 'utf8', function(err) {
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt', 'Different file.', 'utf8', function(err) {
            expect(err).to.not.exist;
            fs.utimes('/1.txt', date, date, function(err) {
              expect(err).to.not.exist;
              fs.utimes('/test/1.txt', date, date, function(err) {
                expect(err).to.not.exist;
                shell.ls('/', {recursive: true}, function(err, stuff){
                  shell.rsync('/1.txt', '/test', {size: 5, checksum: false }, function(err) {
                    expect(err).to.not.exist;
                    fs.readFile('/test/1.txt', 'utf8', function(err, data) {
                      expect(err).to.not.exist;
                      expect(data).to.exist;
                      expect(data).to.equal('Different file.');
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

    it('should suceed if the source file and destination file have the same mtime and size with \'checksum = true\' flag', function(done){
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt', 'This is a file.', 'utf8', function(err) {
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt', 'Different file.', 'utf8', function(err) {
            expect(err).to.not.exist;
            shell.rsync('/1.txt', '/test', {size: 5, checksum: true }, function(err) {
              expect(err).to.not.exist;
              fs.readFile('/test/1.txt', 'utf8', function(err, data) {
                expect(err).to.not.exist;
                expect(data).to.exist;
                expect(data).to.equal('This is a file.');
                done();
              });
            });
          });
        });
      });
    });

    it('should succeed if the destination folder does not exist (Destination file created)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.writeFile('/1.txt','This is my file. It does not exist in the destination folder.', 'utf8', function(err) { 
        expect(err).to.not.exist;
        shell.rsync('/1.txt', '/test', { size: 5 }, function(err) {
          expect(err).to.not.exist;
          fs.readFile('/test/1.txt', 'utf8', function(err, data){
            expect(err).to.not.exist;
            expect(data).to.exist;
            expect(data).to.equal('This is my file. It does not exist in the destination folder.');
            done();
          });
        }); 
      });   
    });

    it('should succeed syncing a directory if the destination directory is empty', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.mkdir('/test2', function(err) {
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt','This is my 1st file. It does not have any typos.', 'utf8', function(err) { 
            expect(err).to.not.exist;
            fs.writeFile('/test/2.txt','This is my 2nd file. It is longer than the destination file.', 'utf8', function(err) { 
              expect(err).to.not.exist;
              shell.rsync('/test', '/test2', { size: 5 }, function(err) {
                expect(err).to.not.exist;
                fs.readFile('/test2/1.txt', 'utf8', function(err, data){
                  expect(err).to.not.exist;
                  expect(data).to.exist;
                  expect(data).to.equal('This is my 1st file. It does not have any typos.');
                  fs.readFile('/test2/2.txt', 'utf8', function(err, data){
                    expect(err).to.not.exist;
                    expect(data).to.exist;
                    expect(data).to.equal('This is my 2nd file. It is longer than the destination file.');
                    done();
                  });
                });
              });
            }); 
          });   
        });
      });
    });

    it('should succeed syncing a directory if the destination directory doesn\'t exist', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/test/1.txt','This is my 1st file. It does not have any typos.', 'utf8', function(err) { 
          expect(err).to.not.exist;
          fs.writeFile('/test/2.txt','This is my 2nd file. It is longer than the destination file.', 'utf8', function(err) { 
          expect(err).to.not.exist;
            shell.rsync('/test', '/test2', { size: 5 }, function(err) {
              expect(err).to.not.exist;
              fs.readFile('/test2/1.txt', 'utf8', function(err, data){
                expect(err).to.not.exist;
                expect(data).to.exist;
                expect(data).to.equal('This is my 1st file. It does not have any typos.');
                fs.readFile('/test2/2.txt', 'utf8', function(err, data){
                  expect(err).to.not.exist;
                  expect(data).to.exist;
                  expect(data).to.equal('This is my 2nd file. It is longer than the destination file.');
                  done();
                });
              });
            });
          }); 
        });   
      });
    });

    it('should succeed syncing a directory recursively, skipping same-size and time files (recursive: true)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var date = Date.parse('1 Oct 2000 15:33:22'); 

      shell.mkdirp('/test/sync', function(err){
        expect(err).to.not.exist;
        shell.mkdirp('/test2/sync', function(err){
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt','This is my 1st file.', 'utf8', function(err) { 
            expect(err).to.not.exist;
            fs.writeFile('/test/sync/2.txt','This is my 2nd file.', 'utf8', function(err) { 
              expect(err).to.not.exist;
              fs.writeFile('/test/sync/3.txt','This is my 3rd file.', 'utf8', function(err) { 
                expect(err).to.not.exist;
                fs.writeFile('/test2/sync/3.txt','This shouldn\'t sync.', 'utf8', function(err) { 
                  expect(err).to.not.exist;

                  fs.utimes('/test/sync/3.txt', date, date, function(err) {
                    expect(err).to.not.exist;
                    fs.utimes('/test2/sync/3.txt', date, date, function(err) {
                      expect(err).to.not.exist;

                      shell.rsync('/test', '/test2', { recursive: true, size: 5 }, function(err) {
                        expect(err).to.not.exist;
                        fs.readFile('/test2/1.txt', 'utf8', function(err, data){
                          expect(err).to.not.exist;
                          expect(data).to.exist;
                          expect(data).to.equal('This is my 1st file.');
                          fs.readFile('/test2/sync/2.txt', 'utf8', function(err, data){
                            expect(err).to.not.exist;
                            expect(data).to.exist;
                            expect(data).to.equal('This is my 2nd file.');
                            fs.readFile('/test2/sync/3.txt', 'utf8', function(err, data){
                              expect(err).to.not.exist;
                              expect(data).to.exist;
                              expect(data).to.equal('This shouldn\'t sync.')
                      
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
          });
        });
      });
    });

  });
});
