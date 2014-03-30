define(["Filer", "util"], function(Filer, util) {
  
  describe('FileSystemShell.mv', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
      var shell = util.shell();
      expect(shell.mv).to.be.a('function');
    });

    it('should fail when source argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.mv(null, null, function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should fail when destination argument is absent', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
      	if(error) throw error;

        shell.mv('/file', null, function(error) {
          expect(error).to.exist;
          done();
        });
      });
    });

    it('should fail when arguments are empty strings', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      shell.mv('', '', function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should fail when the node at source path does not exist', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;
      });

      shell.mv('/file', '/dir', function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should fail when root is provided as source argument', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();

      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;
      });

      shell.mv('/', '/dir', function(error) {
        expect(error).to.exist;
        done();
      });
    });

    it('should rename a file which is moved to the same directory under a different name', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
        expect(error).to.not.exist;
        
        shell.mv('/file', '/newfile', function(error) {
          expect(error).to.not.exist;
          
          fs.stat('/file', function(error, stats) {
            expect(error).to.exist;
            expect(stats).to.not.exist;
            
            fs.stat('/newfile', function(error, stats) {
              expect(error).to.not.exist;
              expect(stats).to.exist;
              done();
            });
          });
        });
      });
    });

    it('should rename a symlink which is moved to the same directory under a different name', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
        expect(error).to.not.exist;

        fs.symlink('/file', '/newfile', function(error) {
          expect(error).to.not.exist;

          shell.mv('/newfile', '/newerfile', function(error) {
            expect(error).to.not.exist;
          
            fs.stat('/file', function(error, stats) {
              expect(error).to.not.exist;
              expect(stats).to.exist;
            
              fs.stat('/newfile', function(error, stats) {
                expect(error).to.exist;
                expect(stats).to.not.exist;
                
                fs.stat('/newerfile', function(error, stats) {
                  expect(error).to.not.exist;
                  expect(stats).to.exist;
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should move a file to a directory which does not currently exist', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.writeFile('/file', contents, function(error) {
      	expect(error).to.not.exist;

        shell.mv('/file', '/dir/newfile', function(error) {
          expect(error).to.not.exist;
          
          fs.stat('/file', function(error, stats) {
            expect(error).to.exist;
            expect(stats).to.not.exist;
            
            fs.stat('/dir/newfile', function(error, stats) {
              expect(error).to.not.exist;
              expect(stats).to.exist;
              done();
            });
          });
        });
      });
    });

    it('should move a file into an empty directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";

      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;
        
        fs.stat('/dir', function(error, stats) {
          expect(error).to.not.exist;
          expect(stats).to.exist;
          
          fs.writeFile('/file', contents, function(error) {
            expect(error).to.not.exist;
            
            fs.stat('/file', function(error, stats) {
              expect(error).to.not.exist;
              expect(stats).to.exist;
              
              shell.mv('/file', '/dir', function(error) {
                expect(error).to.not.exist;
                
                fs.stat('/file', function(error, stats) {
                  expect(error).to.exist;
                  expect(stats).to.not.exist;
                  
                  fs.stat('/dir/file', function(error, stats) {
                    expect(error).to.not.exist;
                    expect(stats).to.exist;
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should move a file into a directory that has a file of the same name', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";
      var contents2 = "b";

      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.writeFile('/file', contents, function(error) {
          expect(error).to.not.exist;

          fs.writeFile('/dir/file', contents2, function(error) {
            expect(error).to.not.exist;
              
            shell.mv('/file', '/dir/file', function(error) {
              expect(error).to.not.exist;
                
              fs.stat('/file', function(error, stats) {
                expect(error).to.exist;
                expect(stats).to.not.exist;
                  
                fs.stat('/dir/file', function(error, stats) {
                  expect(error).to.not.exist;
                  expect(stats).to.exist;

                  fs.readFile('/dir/file', 'utf8', function(error, data) {
                    expect(error).not.to.exist;
                    expect(data).to.equal(contents);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should move an empty directory to a destination that does not currently exist', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        shell.mv('/dir', '/newdir', function(error) {
          expect(error).to.not.exist;

          fs.stat('/dir', function(error, stats) {
            expect(error).to.exist;
            expect(stats).to.not.exist;

            fs.stat('/newdir', function(error, stats) {
              expect(error).to.not.exist;
              expect(stats).to.exist;
              done();
            });
          });
        });
      });
    });

    it('should move an empty directory to another empty directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.mkdir('/otherdir', function(error) {
          expect(error).to.not.exist;

          shell.mv('/dir', '/otherdir', function(error) {
            expect(error).to.not.exist;

            fs.stat('/dir', function(error, stats) {
              expect(error).to.exist;
              expect(stats).to.not.exist;

              fs.stat('/otherdir/dir', function(error, stats) {
                expect(error).to.not.exist;
                expect(stats).to.exist;
                done();
              });
            });
          });
        });
      });
    });

    it('should move an empty directory to a populated directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.mkdir('/otherdir', function(error) {
          expect(error).to.not.exist;

          fs.writeFile('/otherdir/file', contents, function(error) {
            expect(error).to.not.exist;

            shell.mv('/dir', '/otherdir', function(error) {
              expect(error).to.not.exist;

              fs.stat('/dir', function(error, stats) {
                expect(error).to.exist;
                expect(stats).to.not.exist;

                fs.stat('/otherdir/file', function(error, stats) {
                  expect(error).to.not.exist;
                  expect(stats).to.exist;

                  fs.stat('/otherdir/dir', function(error, stats) {
                    expect(error).to.not.exist;
                    expect(stats).to.exist;
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should move a populated directory to a populated directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.mkdir('/otherdir', function(error) {
          expect(error).to.not.exist;

          fs.writeFile('/otherdir/file', contents, function(error) {
            expect(error).to.not.exist;

            fs.writeFile('/dir/file', contents, function(error) {
              expect(error).to.not.exist;

              shell.mv('/dir', '/otherdir', function(error) {
                expect(error).to.not.exist;

                fs.stat('/dir', function(error, stats) {
                  expect(error).to.exist;
                  expect(stats).to.not.exist;

                  fs.stat('/otherdir/file', function(error, stats) {
                    expect(error).to.not.exist;
                    expect(stats).to.exist;

                    fs.stat('/otherdir/dir', function(error, stats) {
                      expect(error).to.not.exist;
                      expect(stats).to.exist;

                      fs.stat('/otherdir/dir/file', function(error, stats) {
                        expect(error).to.not.exist;
                        expect(stats).to.exist;
                        done();
                      })
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should move an empty directory to another empty directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.mkdir('/otherdir', function(error) {
          expect(error).to.not.exist;

          shell.mv('/dir', '/otherdir', function(error) {
            expect(error).to.not.exist;

            fs.stat('/dir', function(error, stats) {
              expect(error).to.exist;
              expect(stats).to.not.exist;

              fs.stat('/otherdir/dir', function(error, stats) {
                expect(error).to.not.exist;
                expect(stats).to.exist;
                done();
              });
            });
          });
        });
      });
    });

    it('should move an empty directory to a populated directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.mkdir('/otherdir', function(error) {
          expect(error).to.not.exist;

          fs.writeFile('/otherdir/file', contents, function(error) {
            expect(error).to.not.exist;

            shell.mv('/dir', '/otherdir', function(error) {
              expect(error).to.not.exist;

              fs.stat('/dir', function(error, stats) {
                expect(error).to.exist;
                expect(stats).to.not.exist;

                fs.stat('/otherdir/file', function(error, stats) {
                  expect(error).to.not.exist;
                  expect(stats).to.exist;

                  fs.stat('/otherdir/dir', function(error, stats) {
                    expect(error).to.not.exist;
                    expect(stats).to.exist;
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should move a populated directory to a populated directory', function(done) {
      var fs = util.fs();
      var shell = fs.Shell();
      var contents = "a";
      
      fs.mkdir('/dir', function(error) {
        expect(error).to.not.exist;

        fs.mkdir('/otherdir', function(error) {
          expect(error).to.not.exist;

          fs.writeFile('/otherdir/file', contents, function(error) {
            expect(error).to.not.exist;

            fs.writeFile('/dir/file', contents, function(error) {
              expect(error).to.not.exist;

              shell.mv('/dir', '/otherdir', function(error) {
                expect(error).to.not.exist;

                fs.stat('/dir', function(error, stats) {
                  expect(error).to.exist;
                  expect(stats).to.not.exist;

                  fs.stat('/otherdir/file', function(error, stats) {
                    expect(error).to.not.exist;
                    expect(stats).to.exist;

                    fs.stat('/otherdir/dir', function(error, stats) {
                      expect(error).to.not.exist;
                      expect(stats).to.exist;

                      fs.stat('/otherdir/dir/file', function(error, stats) {
                        expect(error).to.not.exist;
                        expect(stats).to.exist;
                        done();
                      })
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

