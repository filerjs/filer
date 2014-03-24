// RSync Module for Filer
// Based on the Anchor module for node.js (https://github.com/ttezel/anchor)
// Used under MIT

define(function(require) {
  var Path = require('src/path');
  var async = require('async');
  var _md5 = require('./hash').md5;
  var _weak16 = require('./hash').weak16;
  var _weak32 = require('./hash').weak32;
  var cache = {};
  var options;

  function createHashtable(checksums) {
    var hashtable = {};
    var len = checksums.length;
    var i = 0;
    for (; i < len; i++) {
      var checksum = checksums[i];
      var weak16 = _weak16(checksum.weak);
      if (hashtable[weak16]) {
        hashtable[weak16].push(checksum);
      } else {
        hashtable[weak16] = [checksum];
      }
    }
    return hashtable;
  }

  function roll(data, checksums, chunkSize) {
    var results = [];
    var hashtable = createHashtable(checksums);
    var length = data.length;
    var start = 0;
    var end = chunkSize > length ? length : chunkSize;
        // Updated when a block matches
    var lastMatchedEnd = 0;
        // This gets updated every iteration with the previous weak 32bit hash
    var prevRollingWeak = null;
    for (; end <= length; start++, end++) {
      var weak = _weak32(data, prevRollingWeak, start, end);
      var weak16 = _weak16(weak.sum);
      var match = false;
      prevRollingWeak = weak;
      if (hashtable[weak16]) {
        var len = hashtable[weak16].length;
        var i = 0;
        for (; i < len; i++) {
          if (hashtable[weak16][i].weak === weak.sum) {
            var mightMatch = hashtable[weak16][i];
            var chunk = data.subarray(start, end);
            var strong = _md5(chunk);
            if (mightMatch.strong === strong) {
              match = mightMatch;
              break;
            }
          }
        }
      }
      if (match) {
        if(start < lastMatchedEnd) {
          var d = data.subarray(lastMatchedEnd - 1, end);
          results.push({
            data: d,
            index: match.index
          });
        } else if (start - lastMatchedEnd > 0) {
          var d = data.subarray(lastMatchedEnd, start);
          results.push({
            data: d,
            index: match.index
          });
        } else {
          results.push({
            index: match.index
          });
        }
        lastMatchedEnd = end;
      } else if (end === length) {
        // No match and last block
        var d = data.subarray(lastMatchedEnd);
        results.push({
          data: d
        });
      }
    }
    return results;
  }

  function rsync (srcPath, destPath, opts, callback) {
    var self = this;
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    opts = opts || {};
    opts.size = opts.size || 750;
    options = opts;
    callback = callback || function() {};

    function getSrcList(path, callback) {
      var result = [];
      fs.stat(path, function(err, stats) {
        if(err) callback(err);
        if(stats.type === 'DIRECTORY') {
          fs.readdir(path, function(err, entries) {
            if(err) {
              callback(err);
              return;
            };

            function getSrcContents(name, callback) {
              var name = Path.join(path, name);
              fs.stat(name, function(error, stats) {
                if(error) {
                  callback(error);
                  return;
                }
                var entry = { 
                  path: Path.basename(name),
                  modified: stats.mtime,
                  type: stats.type
                };
                if(options.recursive && stats.type === 'DIRECTORY') {
                  getSrcList(Path.join(srcPath, entry.path), function(error, items) {
                    if(error) {
                      callback(error);
                      return;
                    }
                    entry.contents = items;
                    result.push(entry);
                    callback();
                  });
                } else if(stats.type === 'FILE') {
                    result.push(entry);                
                    callback();
                } else {
                  callback();
                }              
              });
            }
            
            async.each(entries, getSrcContents, function(error) {
              callback(error, result);
            });
          });
        }
        else{
          var entry = { 
            path: Path.basename(path),
            modified: stats.mtime,
            type: stats.type
          };
          result.push(entry);
          callback(err, result);
        }
      });
    }
 
    function getChecksums(destPath, srcList, callback){     
      var result = [];
      function getDirChecksums(entry, callback) {
        var item = { path: entry.path };
        if(options.recursive && entry.type === 'DIRECTORY') {
          getChecksums(Path.join(destPath, entry.path), entry.contents, function(error, items) {
            if(error) {
              callback(error);
              return;
            }
            item.contents = items;
            result.push(item);
            callback();
          });
        } else if(entry.type === 'FILE'){
          checksum.call(self, Path.join(destPath, entry.path), function(err, checksums) {
            if(err) {
              callback(err);
              return;
            }
            item.checksum = checksums;
            result.push(item); 
            callback();               
          });
        }
        else{
          callback();
        }           
      }
      async.each(srcList, getDirChecksums, function(error) {
        callback(error, result);
      });
    }
    
    getSrcList(srcPath, function(err, result){
      console.log(result);
      fs.exists(destPath, function(res){
        self.mkdirp(destPath, function(err){
          getChecksums(destPath, result, function(err, result){
            console.log(result);
            diff.call(self, srcPath, result, function(err, diffs) {
              console.log(diffs);
              sync.call(self, destPath, diffs, function(err){
                callback(err);
              })
            });
          });
        });
      });
    });
  };

  function checksum (path, callback) {
    var self = this;
    fs.readFile(path, function (err, data) {
      if (!err){
        // cache file
        cache[path] = data;  
      }
      else if (err && err.code === 'ENOENT'){
        cache[path] = [];
      }
      else {
        callback(err);
      }
      var length = cache[path].length;
      var incr = options.size;
      var start = 0;
      var end = incr > length ? length : incr;
      var blockIndex = 0;
      var result = [];
      while (start < length) {
        var chunk  = cache[path].subarray(start, end);
        var weak   = _weak32(chunk).sum;
        var strong = _md5(chunk);
        result.push({
          index: blockIndex,
          weak: weak,
          strong: strong
        });
        // update slice indices
        start += incr;
        end = (end + incr) > length ? length : end + incr;
        // update block index
        blockIndex++;
      }
      return callback(null, result);
    });
  }
  
  function diff(path, checksums, callback) {
    var self = this;
    if (!checksums.length) 
      return callback(new Error('attribute does not exist'), null);
    // roll through the file
    var diffs = [];
    fs.stat(path, function(err, stat){
      if(stat.type ==='DIRECTORY') {
        async.each(checksums, getDiff, function(err) {
          callback(err, diffs);
        }); 
      }
      else {
        fs.readFile(path, function (err, data) {
          if (err) { return callback(err); }
          diffs.push({
            diff: roll(data, checksums[0].checksum, options.size),
            path: checksums[0].path
          });
          callback(err, diffs);
        });
      }
    });

    function getDiff(entry, callback) {
      if(entry.hasOwnProperty('contents')) {
        diff.call(self, Path.join(path, entry.path), entry.contents, function(err, stuff) {
          if(err) {
            callback(err);
            return;
          }
          diffs.push({
            path: entry.path,
            contents: stuff
          });
          callback();
        });
      } else {
        fs.readFile(Path.join(path,entry.path), function (err, data) {
          if (err) { return callback(err); }
          diffs.push({
            diff: roll(data, entry.checksum, options.size),
            path: entry.path
          });
          callback(err, diffs);
        });
      }
    }
  }

  function sync(path, diff, callback) {
    var self = this;

    function syncEach(entry, callback){ 
      if(entry.hasOwnProperty('contents')) {
        sync.call(self, Path.join(path, entry.path), entry.contents, function(err){
          if(err) {
            callback(err);
            return;
          }
          callback();
        });
      }
      else {
        var raw = cache[Path.join(path,entry.path)];
        var i = 0;
        var len = entry.diff.length;
        if(typeof raw === 'undefined')
          return callback(new Error('must do checksum() first'), null);

        //get slice of raw file from block's index
        function rawslice(index) {
          var start = index*options.size;
          var end = start + options.size > raw.length 
                  ? raw.length 
                  : start + options.size;
          return raw.subarray(start, end);
        }

        var synced = '';
        var buf = new Uint8Array();
        for(; i < len; i++) {
          var chunk = entry.diff[i];
          if(typeof chunk.data === 'undefined') { //use slice of original file
            buf = appendBuffer(buf, rawslice(chunk.index));
            synced += String.fromCharCode.apply(null, rawslice(chunk.index));
          } else {
            buf = appendBuffer(buf, chunk.data);
            synced += String.fromCharCode.apply(null, chunk.data);
            if(typeof chunk.index !== 'undefined') {
              buf = appendBuffer(buf, rawslice(chunk.index));
              synced += String.fromCharCode.apply(null, rawslice(chunk.index));
            }
          }
        }
        delete cache[Path.join(path,entry.path)];
        fs.writeFile(Path.join(path,entry.path), buf, function(err){
          if(err){
            callback(err);
            return;
          }
          return callback(null);  
        })
        
      }
    }

    async.each(diff, syncEach, function(err) {
      callback(err);
    }); 
  }

  function appendBuffer( buffer1, buffer2 ) {
    var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
    tmp.set( new Uint8Array( buffer1 ), 0 );
    tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
    return tmp;
  }

  return rsync;

});
