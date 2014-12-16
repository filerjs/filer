var Filer = require('..');
var util = require('../tests/lib/test-utils.js');

function setImmediate(cb) {
  setTimeout(cb, 0);
}

function parse_query() {
  var query = window.location.search.substring(1);
  var parsed = {};
  query.split('&').forEach(function(pair) {
    pair = pair.split('=');
    var key = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);
    parsed[key] = value;
  });
  return parsed;
}

var query = parse_query();

function time(test, cb) {
  var start = performance.now();
  function done() {
    var end = performance.now();
    cb(end - start);
  }
  test(done);
}

var random_data = new Buffer(1024); // 1kB buffer
var read_buffer = new Buffer(1024);

function run(iter) {
  iter = (undefined == iter) ? 0 : iter;

  function before() {
    util.setup(function() {
      setImmediate(during);
    });
  }

  function during() {
    var fs = util.fs();

    window.crypto.getRandomValues(random_data);
    time(function(done) {
      fs.mkdir('/tmp', function(err) {
        fs.stat('/tmp', function(err, stats) {
          fs.open('/tmp/test', 'w', function(err, fd) {
            fs.write(fd, random_data, null, null, null, function(err, nbytes) {
              fs.close(fd, function(err) {
                fs.stat('/tmp/test', function(err, stats) {
                  fs.open('/tmp/test', 'r', function(err, fd) {
                    fs.read(fd, read_buffer, null, null, null, function(err, nbytes) {
                      fs.close(fd, function(err) {
                        fs.unlink('/tmp/test', function(err) {
                          done();
                        });});});});});});});});});});
                      }, after);
  }

  function after(dt) {
    util.cleanup(complete.bind(null, iter, dt));
  }

  before();
}

var results = [];
function complete(iter, result) {
  results.push(result);

  if(++iter < iterations) {
    setImmediate(run.bind(null, iter));
  } else {
    do_stats();
  }

  progress.value = iter;
}

function do_stats() {
  var output = document.getElementById("output");
  var stats = {
    mean: ss.mean(results) + " ms",
    min: ss.min(results),
    max: ss.max(results),
    med_abs_dev: ss.median_absolute_deviation(results),
  };

  var t = document.createElement("table");
  var tbody = document.createElement("tbody");
  var keys = Object.keys(stats);
  keys.forEach(function(key) {
    var row = document.createElement("tr");

    var key_cell = document.createElement("td");
    var key_cell_text = document.createTextNode(key);
    key_cell.appendChild(key_cell_text);
    row.appendChild(key_cell);

    var val_cell = document.createElement("td");
    var val_cell_text = document.createTextNode(stats[key]);
    val_cell.appendChild(val_cell_text);
    row.appendChild(val_cell);

    tbody.appendChild(row);
  });

  t.appendChild(tbody);
  output.appendChild(t);
}

var query = parse_query();
var iterations = query.iterations || 10;
var progress = document.getElementById("progress");
progress.max = iterations;

run();
