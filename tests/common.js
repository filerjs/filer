var TEST_DATABASE_NAME = '__test';
var DEFAULT_TIMEOUT = 5000;

var test_database_names = [];
window.onbeforeunload = function() {
  test_database_names.forEach(function(name) {
    indexedDB.deleteDatabase(name);
  });
};

function mk_id(length) {
  var text = '';
  var tokens = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for( var i=0; i < length; i++ )
      text += tokens.charAt(Math.floor(Math.random() * tokens.length));

  return text;
};

function mk_db_name() {
  var name = TEST_DATABASE_NAME + mk_id(5) + Date.now();
  test_database_names.push(name);
  return name;
};

function typed_array_equal(left, right) {
  if(left.length !== right.length) {
    return false;
  }

  for(var i = 0; i < left.length; ++ i) {
    if(left[i] !== right[i]) {
      return false;
    }
  }

  return true;
};
