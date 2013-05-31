define(function(require) {

  function read_object(objectStore, id, callback) {
    var getRequest = objectStore.get(id);
    getRequest.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    getRequest.onerror = function onerror(error) {
      callback(error);
    };
  };

  function write_object(objectStore, object, id, callback) {
    var putRequest = objectStore.put(object, id);
    putRequest.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    putRequest.onerror = function onerror(error) {
      callback(error);
    };
  };

  function delete_object(objectStore, id, callback) {
    var deleteRequest = objectStore.delete(id);
    deleteRequest.onsuccess = function onsuccess(event) {
      var result = event.target.result;
      callback(undefined, result);
    };
    deleteRequest.onerror = function(error) {
      callback(error);
    };
  };

  return {
    read_object: read_object,
    write_object: write_object,
    delete_object: delete_object,
  };

});