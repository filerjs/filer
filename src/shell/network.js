var request = require('request');

module.exports.download = function(uri, callback) {
  request({
    url: uri,
    method: 'GET',
    encoding: null
  }, function(err, msg, body) {
    var statusCode;
    var error;

    msg = msg || null;
    statusCode = msg && msg.statusCode;
    error = statusCode !== 200 ? { message: err || 'Not found!', code: statusCode } : null;

    if (error) {
      callback(error, null);
      return;
    }
    callback(null, body);
  });
};
