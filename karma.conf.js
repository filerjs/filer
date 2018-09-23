module.exports = function(config) {
  config.set({
    npm_config_coverage: ['true'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
    basePath: '',
    files: ['tests/dist/index.js'],

    frameworks: ['mocha', 'chai'],
    reporters: ['mocha', 'coverage', 'progress'],
    client: {
      mocha: {
        ui: 'bdd',
        timeout: 5000,
        slow: 250
      }
    },
    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'src/**/*.js': ['coverage']
    },

    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    }

  });
};
