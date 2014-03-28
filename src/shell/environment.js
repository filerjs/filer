define(function(require) {

  var defaults = require('src/constants').ENVIRONMENT;

  function Environment(env) {
    env = env || {};
    env.TMP = env.TMP || defaults.TMP;
    env.PATH = env.PATH || defaults.PATH;

    this.get = function(name) {
      return env[name];
    };

    this.set = function(name, value) {
      env[name] = value;
    };
  }

  return Environment;
});
