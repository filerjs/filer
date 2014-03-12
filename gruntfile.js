module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: ['dist/'],

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
        'src/adapters/**/*.js'
      ]
    },

    mocha: {
      test: {
        src: 'tests/index.html',
        options: {
          log: true
        }
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
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha');

  grunt.registerTask('develop', ['clean', 'requirejs']);
  grunt.registerTask('release', ['develop', 'uglify']);
  grunt.registerTask('check', ['jshint']);
  grunt.registerTask('test', ['check', 'mocha']);

  grunt.registerTask('default', ['develop']);
};
