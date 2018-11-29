var Errors = require('./errors.js');

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  }).toUpperCase();
}

function nop() {}

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
  nop: nop,
  validateInteger: validateInteger,
};
