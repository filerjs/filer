module.exports = function(config) {
  config.set({
    singleRun: true,
    basePath: '',
    files: ['tests/dist/index.js'],
    frameworks: ['mocha', 'chai'],
    reporters: ['mocha', 'summary'],
    client: {
      captureConsole: true,
      mocha: {
        ui: 'bdd',
        timeout: 5000,
        slow: 250
      }
    },
    summaryReporter: {
      // 'failed', 'skipped' or 'all'
      show: 'failed',
      // Limit the spec label to this length
      specLength: 50,
      // Show an 'all' column as a summary
      overviewColumn: true
    }
  });
};
