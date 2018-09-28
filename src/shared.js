var Errors = require('./errors.js');

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  }).toUpperCase();
}

function nop() {}

/**
 * Convert a Uint8Array to a regular array
 */
function u8toArray(u8) {
  var array = [];
  var len = u8.length;
  for(var i = 0; i < len; i++) {
    array[i] = u8[i];
  }
  return array;
}

function validateInteger(value, name) {
  let err;

  if (typeof value !== 'number')
    err = new Errors.EINVAL(name, 'number', value);

  if (err) {
    Error.captureStackTrace(err, validateInteger);
    throw err;
  }

  return value;
}


module.exports = {
  guid: guid,
  u8toArray: u8toArray,
  nop: nop,
  validateInteger: validateInteger,
};
