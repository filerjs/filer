// RSync hashing algorithms
// Based on node.js Anchor's hash.js
// Used under MIT License 
// https://github.com/ttezel/anchor

define(function(require) {
  require("crypto-js/rollups/md5"); 

  function md5(data) {
    return CryptoJS.MD5(String.fromCharCode.apply(null, data)).toString();
  }
  function weak32(data, prev, start, end) {
    var a = 0,
        b = 0,
        sum = 0,
        M = 1 << 16;

    if (!prev) {
      var len = start >= 0 && end >= 0 ? end - start : data.length,
          i = 0;

        for (; i < len; i++) {
          a += data[i];
          b += a;
        }

        a %= M;
        b %= M;
    } else {
      var k = start,
          l = end - 1,
          prev_k = k - 1,
          prev_l = l - 1,
          prev_first = data[prev_k],
          prev_last = data[prev_l],
          curr_first = data[k],
          curr_last = data[l];
      
      a = (prev.a - prev_first + curr_last) % M
      b = (prev.b - (prev_l - prev_k + 1) * prev_first + a) % M
    }
    return { a: a, b: b, sum: a + b * M };
  }
  function weak16(data) {
    return 0xffff & (data >> 16 ^ data*1009);
  }

  return {
    md5: md5,
    weak16: weak16,
    weak32: weak32
  };
});
