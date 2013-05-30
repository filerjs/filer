define(function(require) {

  var when = require('when');

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  /*
   * Transaction
   */

  function Transaction(idbDatabase, storeNames, mode) {
    this.idbTransaction = idbDatabase.transaction(storeNames, mode);
  };
  Transaction.prototype.objectStore = function objectStore(name) {
    var idbTransaction = this.idbTransaction;
    return new ObjectStore(idbTransaction, name);
  };
  Transaction.prototype.abort = function abort() {
    var idbTransaction = this.idbTransaction;
    return idbTransaction.abort();
  };

  /*
   * Database
   */

  function Database(idbDatabase) {
    this.idbDatabase = idbDatabase;

    Object.defineProperty(this, 'name', {
      get: function() {
        return idbDatabase.name;
      }
    });

    Object.defineProperty(this, 'version', {
      get: function() {
        return idbDatabase.version;
      }
    });

    Object.defineProperty(this, 'objectStoreNames', {
      get: function() {
        return idbDatabase.objectStoreNames;
      }
    });
  };
  Database.prototype.createObjectStore = function createObjectStore(name, optionalParameters) {
    var idbDatabase = this.idbDatabase;
    return idbDatabase.createObjectStore(name, optionalParameters);
  };
  Database.prototype.deleteObjectStore = function deleteObjectStore(name) {
    var idbDatabase = this.idbDatabase;
    return idbDatabase.deleteObjectStore(name);
  };
  Database.prototype.transaction = function transaction(storeNames, mode) {
    var idbDatabase = this.idbDatabase;
    return new Transaction(idbDatabase, storeNames, mode);
  };
  Database.prototype.close = function close() {
    var idbDatabase = this.idbDatabase;
    return idbDatabase.close();
  };
  Database.prototype.objectStoreNames = function objectStoreNames() {
    var idbDatabase = this.idbDatabase;
    return idbDatabase.objectStoreNames;
  };

  /*
   * Factory
   */

  function Factory() {
    this.when = when;
  };
  Factory.prototype.open = function open(name, version) {
    var deferred = when.defer();

    var request = indexedDB.open(name);
    request.onupgradeneeded = function(idbEvent) {
      var db = new Database(idbEvent.target.result);
      var event = {
        type: 'upgradeneeded',
        db: db
      };
      deferred.notify(event);
    };
    request.onsuccess = function(idbEvent) {
      var db = new Database(idbEvent.target.result);
      var event = {
        type: 'success',
        db: db
      };
      deferred.resolve(event);
    };
    request.onerror = function(idbError) {
      deferred.reject(idbError);
    };

    return deferred.promise;
  };
  Factory.prototype.deleteDatabase = function deleteDatabase(name) {

  };

  return new Factory();

});