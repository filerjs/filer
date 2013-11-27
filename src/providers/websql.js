define(function(require) {
  var FILE_SYSTEM_NAME = require('src/constants').FILE_SYSTEM_NAME;
  var FILE_STORE_NAME = require('src/constants').FILE_STORE_NAME;
  var WSQL_VERSION = require('src/constants').WSQL_VERSION;
  var WSQL_SIZE = require('src/constants').WSQL_SIZE;
  var WSQL_DESC = require('src/constants').WSQL_DESC;

  function WebSQLContext(db, isReadOnly) {
    var that = this;
    this.getTransaction = function(callback) {
      if(that.transaction) {
        callback(that.transaction);
        return;
      }
      // Either do readTransaction() (read-only) or transaction() (read/write)
      db[isReadOnly ? 'transaction' : 'readTransaction'](function(transaction) {
        that.transaction = transaction;
        callback(transaction);
      });
    };
  }
  WebSQLContext.prototype.clear = function(callback) {
    function onSuccess(transaction, result) {
      callback(null);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("DELETE FROM " + FILE_STORE_NAME,
                             [], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.get = function(key, callback) {
    function onSuccess(transaction, result) {
      if(result.rows.length !== 1) {
        callback("[WebSQLContext] Error: expected 1 row for get operation.");
        return;
      }
      callback(null, result.rows.item(0).data);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("SELECT * FROM " + FILE_STORE_NAME + " WHERE id = ?",
                             [key], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.put = function(key, value, callback) {
    function onSuccess(transaction, result) {
      callback(null);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("INSERT OR REPLACE INTO " + FILE_STORE_NAME + " (id, data)",
                             [key, value], onSuccess, onError);
    });
  };
  WebSQLContext.prototype.delete = function(key, callback) {
    function onSuccess(transaction, result) {
      callback(null);
    }
    function onError(transaction, error) {
      callback(error);
    }
    this.getTransaction(function(transaction) {
      transaction.executeSql("DELETE FROM " + FILE_STORE_NAME + " WHERE id = ?",
                             [key], onSuccess, onError);
    });
  };


  function WebSQL(name) {
    this.name = name || FILE_SYSTEM_NAME;
    this.db = null;
  }
  WebSQL.isSupported = function() {
    return !!window.openDatabase;
  };

  WebSQL.prototype.open = function(callback) {
    var that = this;

    // Bail if we already have a db open
    if(that.db) {
      callback(null, false);
      return;
    }

    var db = window.openDatabase(that.name, WSQL_VERSION, WSQL_DESC, WSQL_SIZE);
    if(!db) {
      callback("[WebSQL] Unable to open database.");
      return;
    }
    that.db = db;

    function onError(transaction, error) {
      callback(error);
    }
    function onSuccess(transaction, result) {
      function gotCount(transaction, result) {
        var firstAccess = result.rows.item(0).count > 0;
        callback(null, firstAccess);
      }
      function onError(transaction, error) {
        callback(error);
      }
      // Keep track of whether we're accessing this db for the first time
      // and therefore needs to get formatted.
      transaction.executeSql("SELECT COUNT(id) AS count FROM " + FILE_STORE_NAME,
                             [], gotCount, onError);
    }

    db.transaction(function(transaction) {
      transaction.executeSql("CREATE TABLE IF NOT EXISTS " + FILE_STORE_NAME + " (id unique, data)",
                             [], onSuccess, onError);
    });
  };
  WebSQL.prototype.getReadOnlyContext = function() {
    return new WebSQLContext(this.db, true);
  };
  WebSQL.prototype.getReadWriteContext = function() {
    return new WebSQLContext(this.db, false);
  };

  return WebSQL;
});
