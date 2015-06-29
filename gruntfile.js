var semver = require('semver'),
    fs = require('fs'),
    currentVersion = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version,
    env = require('./config/environment');

// Globals
var PROMPT_CONFIRM_CONFIG = 'confirmation',
    GIT_BRANCH = env.get('FILER_UPSTREAM_BRANCH'),
    GIT_REMOTE = env.get('FILER_UPSTREAM_REMOTE_NAME'),
    GIT_FULL_REMOTE = env.get('FILER_UPSTREAM_URI') + ' ' + GIT_BRANCH;

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: ['dist/filer-test.js', 'dist/filer-issue225.js', 'dist/filer-perf.js'],

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      develop: {
        src: 'dist/filer.js',
        dest: 'dist/filer.min.js'
      },
      path: {
        src: 'dist/path.js',
        dest: 'dist/path.min.js'
      },
      buffer: {
        src: 'dist/buffer.js',
        dest: 'dist/buffer.min.js'
      }
    },

    jshint: {
      // Don't bother with src/path.js
      all: [
        'gruntfile.js',
        'config/environment.js',
        'src/constants.js',
        'src/errors.js',
        'src/fs.js',
        'src/index.js',
        'src/shared.js',
        'src/shell.js',
        'src/fswatcher.js',
        'src/environment.js',
        'src/providers/**/*.js',
        'src/adapters/**/*.js',
        'src/directory-entry.js',
        'src/open-file-description.js',
        'src/super-node.js',
        'src/node.js',
        'src/stats.js',
        'src/filesystem/**/*.js'
      ]
    },

    browserify: {
      filerDist: {
        src: "./src/index.js",
        dest: "./dist/filer.js",
        options: {
          browserifyOptions: {
            commondir: false,
            builtins: ["buffer", "path", "url", "punycode", "querystring"],
            insertGlobalVars: {
              // This ensures that process won't be defined, since
              // browserify will do so automatically if any globals
              // are requested by us or detected by browserify.
              process: function() {
                return undefined;
              }
            },
            standalone: 'Filer'
          },
          exclude: ["./node_modules/request/index.js"]
        }
      },
      filerPerf: {
        src: "./perf/index.js",
        dest: "./dist/filer-perf.js",
        options: {
          browserifyOptions: {
            commondir: false,
            builtins: ["buffer", "path", "url", "punycode", "querystring"],
            insertGlobalVars: {
              // This ensures that process won't be defined, since
              // browserify will do so automatically if any globals
              // are requested by us or detected by browserify.
              process: function() {
                return undefined;
              }
            },
            standalone: 'Filer'
          }
        }
      },
      filerTest: {
        src: "./tests/index.js",
        dest: "./dist/filer-test.js",
        options: {
          browserifyOptions: {
            commondir: false,
            builtins: ["buffer", "path", "url", "punycode", "querystring"],
            insertGlobalVars: {
              // This ensures that process won't be defined, since
              // browserify will do so automatically if any globals
              // are requested by us or detected by browserify.
              process: function() {
                return undefined;
              }
            }
          }
        }
      },
      // See tests/bugs/issue225.js
      filerIssue225: {
        src: "./src/index.js",
        dest: "./dist/filer-issue225.js",
        options: {
          browserifyOptions: {
            commondir: false,
            builtins: ["buffer", "path", "url", "punycode", "querystring"],
            insertGlobalVars: {
              // This ensures that process won't be defined, since
              // browserify will do so automatically if any globals
              // are requested by us or detected by browserify.
              process: function() {
                return undefined;
              }
            },
            standalone: 'Filer'
          }
        }
      },

      // For low-cost access to filer's `Path` and `buffer` modules
      filerPath: {
        src: "./src/path.js",
        dest: "./dist/path.js",
        options: {
          browserifyOptions: {
            standalone: 'Path'
          }
        }
      },
      filerBuffer: {
        src: "./src/buffer.js",
        dest: "./dist/buffer.js",
        options: {
          browserifyOptions: {
            standalone: 'FilerBuffer'
          }
        }
      }
    },

    shell: {
      mocha: {
        // Run all tests (e.g., tests require()'ed in tests/index.js) and also tests/bugs/issue225.js
        // separately, since it can't be included in a browserify build.
        command: '"./node_modules/.bin/mocha" --reporter list tests/index.js && "./node_modules/.bin/mocha" --reporter list tests/bugs/issue225.js'
      }
    },

    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        commit: true,
        commitMessage: 'v%VERSION%',
        commitFiles: ['package.json', 'bower.json', './dist/filer.js', './dist/filer.min.js'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'v%VERSION%',
        push: true,
        pushTo: GIT_FULL_REMOTE
      }
    },

    'npm-checkBranch': {
      options: {
        branch: GIT_BRANCH
      }
    },

    'npm-publish': {
      options: {
        abortIfDirty: false
      }
    },

    prompt: {
      confirm: {
        options: {
          questions: [
            {
              config: PROMPT_CONFIRM_CONFIG,
              type: 'confirm',
              message: 'Bump version from ' + (currentVersion).cyan +
                          ' to ' + semver.inc(currentVersion, "patch").yellow + '?',
              default: false
            }
          ],
          then: function(results) {
            if (!results[PROMPT_CONFIRM_CONFIG]) {
              return grunt.fatal('User aborted...');
            }
          }
        }
      }
    },

    gitcheckout: {
      publish: {
        options: {
          branch: 'gh-pages',
          force: true
        }
      },
      revert: {
        options: {
          branch: GIT_BRANCH
        }
      }
    },

    gitpush: {
      publish: {
        options: {
          remote: GIT_REMOTE,
          branch: 'gh-pages',
          force: true
        },
      }
    },

    gitcommit: {
      publish: {
        options: {
          noStatus: true
        }
      }
    },

    gitadd: {
      publish: {
        files: {
          src: ['./dist/filer-test.js', './dist/filer-perf.js']
        }
      }
    },

    gitstash: {
      publish: {
      },
      pop: {
        options: {
          command: "pop"
        }
      }
    },

    gitrm: {
      publish: {
        options: {
          force: true
        },
        files: {
          src: ['./dist/filer-test.js', './dist/filer-perf.js']
        }
      }
    },

    connect: {
      serverForBrowser: {
        options: {
          port: 1234,
          base: './',
          keepalive: true
        }
      }
    },

    usebanner: {
      publish: {
        options: {
          position: "top"
        },
        files: {
          src: ['./dist/filer-test.js', './dist/filer-perf.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-npm');
  grunt.loadNpmTasks('grunt-git');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-banner');

  grunt.registerTask('develop', [
    'browserify:filerDist',
    'browserify:filerPath',
    'browserify:filerBuffer',
    'uglify:develop',
    'uglify:path',
    'uglify:buffer'
  ]);

  grunt.registerTask('build-tests', ['clean', 'browserify:filerTest', 'browserify:filerPerf',  'browserify:filerIssue225']);
  grunt.registerTask('release', ['test', 'develop']);

  grunt.registerTask('publish', 'Publish filer as a new version to NPM, bower and github.', function(patchLevel) {
    var allLevels = ['patch', 'minor', 'major'];

    // No level specified defaults to 'patch'
    patchLevel = (patchLevel || 'patch').toLowerCase();

    // Fail out if the patch level isn't recognized
    if (allLevels.filter(function(el) { return el == patchLevel; }).length === 0) {
      return grunt.fatal('Patch level not recognized! "Patch", "minor" or "major" only.');
    }

    // Set prompt message
    var promptOpts = grunt.config('prompt.confirm.options');
    promptOpts.questions[0].message =  'Bump version from ' + (currentVersion).cyan +
      ' to ' + semver.inc(currentVersion, patchLevel).yellow + '?';
    grunt.config('prompt.confirm.options', promptOpts);

    // Store the new version in the gh-pages commit message
    var ghPagesMessage = 'Tests for Filer v' + semver.inc(currentVersion, patchLevel);
    grunt.config('gitcommit.publish.options.message', ghPagesMessage);

    // Store the new version as a banner in the test file
    // NOTE: This is a hack intended to ensure that this build process
    //       succeeds even if no changes were made to the tests
    //       before publishing a new version. Otherwise, the automatic
    //       commit + push to github pages would break a normal build
    var bannerMsg = "/* Test file for filerjs v" + semver.inc(currentVersion, patchLevel) + "*/";
    grunt.config('usebanner.publish.options.banner', bannerMsg);

    grunt.task.run([
      'prompt:confirm',
      'checkBranch',
      'release',
      'bump:' + patchLevel,
      'build-tests',
      'usebanner:publish',
      'gitadd:publish',
      'gitstash:publish',
      'gitcheckout:publish',
      'gitrm:publish',
      'gitstash:pop',
      'gitcommit:publish',
      'gitpush:publish',
      'gitcheckout:revert',
      'npm-publish'
    ]);
  });
  grunt.registerTask('test-node', ['jshint', 'browserify:filerIssue225', 'shell:mocha']);
  grunt.registerTask('test-browser', ['jshint', 'build-tests', 'connect:serverForBrowser']);
  grunt.registerTask('test', ['test-node']);

  grunt.registerTask('default', ['test']);
};
