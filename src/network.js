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
  require('request')({
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

module.exports = function(uri, callback) {
  if (typeof XMLHttpRequest === 'undefined') {
    nodeDownload(uri, callback);
  } else {
    browserDownload(uri, callback);
  }
};
