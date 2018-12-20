function generateRandom(template) {
  return template.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function guid() {
  return generateRandom('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').toUpperCase();
}

/**
 * Generate a string of n random characters.  Defaults to n=6.
 */ 
function randomChars(n) {
  n = n || 6;
  var template = 'x'.repeat(n);
  return generateRandom(template);
}

function nop() {}

module.exports = {
  guid: guid,
  nop: nop,
  randomChars: randomChars
};
