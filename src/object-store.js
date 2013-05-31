define(function(require) {

  var ENoEntry = require('src/error').ENoEntry;
  var ENotDirectory = require('src/error').ENotDirectory;
  var EExists = require('src/error').EExists;

  var normalize = require('src/path').normalize;
  var dirname = require('src/path').dirname;
  var basename = require('src/path').basename;

  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var ROOT_NODE_ID = require('src/constants').ROOT_NODE_ID;

  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;

  // in: file or directory path
  // out: node structure, or error
  function find_node(objectStore, path, callback) {
    path = normalize(path);
    if(!path) {
      return callback(new ENoEntry('path is an empty string'));
    }
    var name = basename(path);

    if(ROOT_DIRECTORY_NAME == name) {
      function check_root_directory_node(error, rootDirectoryNode) {
        if(error) {
          callback(error);
        } else if(!rootDirectoryNode) {
          callback(new ENoEntry('path does not exist'));
        } else {
          callback(undefined, rootDirectoryNode);
        }
      };

      read_object(objectStore, ROOT_NODE_ID, check_root_directory_node);
    } else {
      // in: parent directory node
      // out: parent directory data
      function read_parent_directory_data(error, parentDirectoryNode) {
        if(error) {
          callback(error);
        } else if(!_(parentDirectoryNode).has('data') || !parentDirectoryNode.type == MODE_DIRECTORY) {
          callback(new ENotDirectory('a component of the path prefix is not a directory'));
        } else {
          read_object(objectStore, parentDirectoryNode.data, get_node_id_from_parent_directory_data);
        }
      };

      // in: parent directory data
      // out: searched node id
      function get_node_id_from_parent_directory_data(error, parentDirectoryData) {
        if(error) {
          callback(error);
        } else {
          if(!_(parentDirectoryData).has(name)) {
            callback(new ENoEntry('path does not exist'));
          } else {
            var nodeId = parentDirectoryData[name].id;
            read_object(objectStore, nodeId, callback);
          }
        }
      };

      var parentPath = dirname(path);
      find_node(objectStore, parentPath, read_parent_directory_data);
    }
  };

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
    find_node: find_node
  };

});