module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: ['dist/filer-test.js'],

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
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
      develop: {
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
            startFile: 'build/wrap.start',
            endFile: 'build/wrap.end'
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
      test: {
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
            startFile: 'build/wrap.start',
            endFile: 'build/wrap.end'
          },
          shim: {
            // TextEncoder and TextDecoder shims. encoding-indexes must get loaded first,
            // and we use a fake one for reduced size, since we only care about utf8.
            "encoding": {
              deps: ["encoding-indexes-shim"]
            }
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('develop', ['clean', 'requirejs:develop']);
  grunt.registerTask('filer-test', ['clean', 'requirejs:test']);
  grunt.registerTask('release', ['develop', 'uglify']);
  grunt.registerTask('check', ['jshint']);
  grunt.registerTask('test', ['check', 'filer-test', 'shell:mocha']);

  grunt.registerTask('default', ['test']);
};
