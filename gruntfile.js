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

    clean: ['dist/filer-test.js', 'dist/filer_node-test.js'],

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      develop: {
        src: 'dist/filer.js',
        dest: 'dist/filer.min.js'
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

    shell: {
      mocha: {
        command: './node_modules/.bin/mocha --reporter list --no-exit tests/node-runner.js'
      }
    },

    requirejs: {
      browser_develop: {
        options: {
          paths: {
            "src": "../src",
            "build": "../build"
          },
          baseUrl: "lib",
          name: "build/almond",
          include: ["src/index"],
          out: "dist/filer.js",
          optimize: "none",
          wrap: {
            startFile: 'build/browser_wrap.start',
            endFile: 'build/browser_wrap.end'
          },
          shim: {
            // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
            // and we use a fake one for reduced size, since we only care about utf8.
            "encoding": {
              deps: ["encoding-indexes-shim"]
            }
          }
        }
      },
      node_develop: {
        options: {
          paths: {
            "src": "../src",
            "build": "../build"
          },
          baseUrl: "lib",
          name: "require",
          include: ["src/index"],
          out: "dist/filer_node.js",
          optimize: "none",
          wrap: {
            startFile: 'build/node_wrap.start',
            endFile: 'build/node_wrap.end'
          },
          shim: {
            // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
            // and we use a fake one for reduced size, since we only care about utf8.
            "encoding": {
              deps: ["encoding-indexes-shim"]
            }
          },
          nodeRequire: require
        }
      },
      browser_test: {
        options: {
          paths: {
            "src": "../src",
            "build": "../build"
          },
          baseUrl: "lib",
          name: "build/almond",
          include: ["src/index"],
          out: "dist/filer-test.js",
          optimize: "none",
          wrap: {
            startFile: 'build/browser_wrap.start',
            endFile: 'build/browser_wrap.end'
          },
          shim: {
            // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
            // and we use a fake one for reduced size, since we only care about utf8.
            "encoding": {
              deps: ["encoding-indexes-shim"]
            }
          }
        }
    },
      node_test: {
        options: {
          paths: {
            "src": "../src",
            "build": "../build"
          },
          baseUrl: "lib",
          name: "require",
          include: ["src/index"],
          out: "dist/filer_node-test.js",
          optimize: "none",
          wrap: {
            startFile: 'build/node_wrap.start',
            endFile: 'build/node_wrap.end'
          },
          shim: {
            // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
            // and we use a fake one for reduced size, since we only care about utf8.
            "encoding": {
              deps: ["encoding-indexes-shim"]
            }
          },
          nodeRequire: require
        }
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
        abortIfDirty: true
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
          overwrite: true
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
    connect: {
      server_for_node: {
        options: {
          port: 1234,
          base: '.'
        }
      },
      server_for_browser: {
        options: {
          port: 1234,
          base: '.',
          keepalive: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-npm');
  grunt.loadNpmTasks('grunt-git');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('develop', ['clean', 'requirejs:browser_develop', 'requirejs:node_develop']);
  grunt.registerTask('filer-test', ['clean', 'requirejs:node_test', 'requirejs:browser_test']);
  grunt.registerTask('release', ['develop', 'uglify']);
  grunt.registerTask('check', ['jshint']);

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

    grunt.task.run([
      'prompt:confirm',
      'checkBranch',
      'release',
      'bump:' + patchLevel,
      'gitcheckout:publish',
      'gitpush:publish',
      'gitcheckout:revert',
      'npm-publish'
    ]);
  });
  grunt.registerTask('test-node', ['check', 'filer-test', 'connect:server_for_node', 'shell:mocha']);
  grunt.registerTask('test-browser', ['check', 'filer-test', 'connect:server_for_browser']);
  grunt.registerTask('test', ['test-node']);

  grunt.registerTask('default', ['test']);
};
