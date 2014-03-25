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

    it('should succeed if the source file is altered in content but not length from the destination file. (Destination edited)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.writeFile('/1.txt','This is my file. It does not have any typos.','utf8',function(err) { 
          expect(err).to.not.exist;
          fs.writeFile('/test/1.txt','This is my fivth file. It doez not have any topos,', 'utf8', function(err) {
            expect(err).to.not.exist;
            shell.rsync('/1.txt', '/test', { size: 5 }, function(err) {
              expect(err).to.not.exist;
              fs.readFile('/test/1.txt', 'utf8', function(err, data){
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

    it('should succeed syncing a directory recursively (recursive: true)', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      fs.mkdir('/test', function(err) {
        expect(err).to.not.exist;
        fs.mkdir('/test2', function(err) {
          expect(err).to.not.exist;
          fs.mkdir('/test/sync', function(err) {
            expect(err).to.not.exist;
            fs.mkdir('/test2/sync', function(err) {
              expect(err).to.not.exist;

              fs.writeFile('/test/1.txt','This is my 1st file. It does not have any typos.', 'utf8', function(err) { 
                expect(err).to.not.exist;
                fs.writeFile('/test/2.txt','This is my 2nd file. It is longer than the destination file.', 'utf8', function(err) { 
                  expect(err).to.not.exist;
                  fs.writeFile('/test/sync/3.txt','This is my 3rd file.', 'utf8', function(err) { 
                    expect(err).to.not.exist;
                    fs.writeFile('/test/sync/5.txt','This is my 5th file. It does not exist in the destination folder.', 'utf8', function(err) { 
                      expect(err).to.not.exist;
                      fs.writeFile('/test2/1.txt','This is my 1st file. It doez not have any topos,', 'utf8', function(err) { 
                        expect(err).to.not.exist;
                        fs.writeFile('/test2/2.txt','This is my 2nd file.', 'utf8', function(err) { 
                          expect(err).to.not.exist;
                          fs.writeFile('/test2/sync/3.txt','This is my 3rd file. It is longer than the source version.', 'utf8', function(err) { 
                            expect(err).to.not.exist;
                            fs.writeFile('/test2/sync/4.txt','This is my 4th file. It does not exist in the source folder.', 'utf8', function(err) { 
                              expect(err).to.not.exist;
                              
                              shell.rsync('/test', '/test2', { recursive: true, size: 5 }, function(err) {
                                expect(err).to.not.exist;
                                fs.readFile('/test2/1.txt', 'utf8', function(err, data){
                                  expect(err).to.not.exist;
                                  expect(data).to.exist;
                                  expect(data).to.equal('This is my 1st file. It does not have any typos.');
                                  fs.readFile('/test2/2.txt', 'utf8', function(err, data){
                                    expect(err).to.not.exist;
                                    expect(data).to.exist;
                                    expect(data).to.equal('This is my 2nd file. It is longer than the destination file.');
                                    fs.readFile('/test2/sync/3.txt', 'utf8', function(err, data){
                                      expect(err).to.not.exist;
                                      expect(data).to.exist;
                                      expect(data).to.equal('This is my 3rd file.')
                                      fs.readFile('/test2/sync/4.txt', 'utf8', function(err, data){
                                        expect(err).to.not.exist;
                                        expect(data).to.exist;
                                        expect(data).to.equal('This is my 4th file. It does not exist in the source folder.')
                                        fs.readFile('/test2/sync/5.txt', 'utf8', function(err, data){
                                          expect(err).to.not.exist;
                                          expect(data).to.exist;
                                          expect(data).to.equal('This is my 5th file. It does not exist in the destination folder.')
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
          });
        });
      });

    });

  });
});
