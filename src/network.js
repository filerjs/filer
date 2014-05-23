define(function(require) {
  // Pull in node's request module if possible/needed
  if (typeof XMLHttpRequest === 'undefined') {
    // This is a stupid workaround for the fact that
    // the r.js optimizer checks every require() call
    // during optimization and throws an error if it
    // can't find the module.
    //
    // This is only an issue with our browser build
    // using `almond` (https://github.com/jrburke/almond)
    // which doesn't fallback to node's require when we
    // need it to.
    var node_req = require;
    var request = node_req('request');
  }

  function browserDownload(uri, callback) {
    var query = new XMLHttpRequest();
    query.onload = function() {
      var err = query.status != 200 ? { message: query.statusText, code: query.status } : null,
          data = err ? null : new Uint8Array(query.response);

      callback(err, data);
    };
    query.open("GET", uri);
    if("withCredentials" in query) {
      query.withCredentials = true;
    }

    query.responseType = "arraybuffer";
    query.send();
  }

  function nodeDownload(uri, callback) {
    request({
      url: uri,
      method: "GET",
      encoding: null
    }, function(err, msg, body) {
      var data = null,
          arrayBuffer,
          statusCode,
          arrayLength = body && body.length,
          error;

      msg = msg || null;
      statusCode = msg && msg.statusCode;

      error = statusCode != 200 ? { message: err || 'Not found!', code: statusCode } : null;

      arrayBuffer = arrayLength && new ArrayBuffer(arrayLength);

      // Convert buffer to Uint8Array
      if (arrayBuffer && (statusCode == 200)) {
        data = new Uint8Array(arrayBuffer);
        for (var i = 0; i < body.length; ++i) {
          data[i] = body[i];
        }
      }

      callback(error, data);
    });
  }

  return {
    download: function(uri, callback) {
      if (!uri) {
        throw('Uri required!');
      }

      if (!callback) {
        throw('Callback required');
      }

      if (typeof XMLHttpRequest === "undefined") {
        nodeDownload(uri, callback);
      } else {
        browserDownload(uri, callback);
      }
    }
  };
});
