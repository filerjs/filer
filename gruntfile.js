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
        src: 'dist/idbfs.js',
        dest: 'dist/idbfs.min.js'
      }
    },

    jshint: {
      // Don't bother with src/path.js
      all: ['gruntfile.js',
            'src/constants.js',
            'src/error.js',
            'src/fs.js',
            'src/shared.js',
            'src/providers/**/*.js',
            'src/filesystems-manager.js'
           ]
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
          include: ["src/fs"],
          out: "dist/idbfs.js",
          optimize: "none",
          wrap: {
            startFile: 'build/wrap.start',
            endFile: 'build/wrap.end'
          }
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('develop', ['clean', 'requirejs']);
  grunt.registerTask('release', ['develop', 'uglify']);
  grunt.registerTask('check', ['jshint']);

  grunt.registerTask('default', ['develop']);
};
