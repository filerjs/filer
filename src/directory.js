define(function(require) {

  var read_object = require('src/object-store').read_object;
  var write_object = require('src/object-store').write_object;
  var delete_object = require('src/object-store').delete_object;

  var ENoEntry = require('src/error').ENoEntry;
  var ENotDirectory = require('src/error').ENotDirectory;
  var EPathExists = require('src/error').EPathExists;

  var MODE_FILE = require('src/constants').MODE_FILE;
  var MODE_DIRECTORY = require('src/constants').MODE_DIRECTORY;
  var ROOT_DIRECTORY_NAME = require('src/constants').ROOT_DIRECTORY_NAME;
  var ROOT_NODE_ID = require('src/constants').ROOT_NODE_ID;

  var Node = require('src/file').Node;

  var normalize = require('src/path').normalize;
  var dirname = require('src/path').dirname;
  var basename = require('src/path').basename;

  function DirectoryEntry(id, type) {
    this.id = id;
    this.type = type || MODE_FILE;
  };

  // in: file or directory path
  // out: node structure, or error
  function find_node(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);

    if(ROOT_DIRECTORY_NAME == name) {
      function check_root_directory_node(error, rootDirectoryNode) {
        if(error) {
          callback(error);
        } else if(!rootDirectoryNode) {
          callback(new ENoEntry());
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
          callback(new ENotDirectory());
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
            callback(new ENoEntry());
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

  // Note: this should only be invoked when formatting a new file system
  function make_root_directory(objectStore, callback) {
    var directoryNode;
    var directoryData;

    function write_directory_node(error, existingNode) {
      if(!error && existingNode) {
        callback(new EPathExists());
      } else if(error && !error instanceof ENoEntry) {
        callback(error);
      } else {
        directoryNode = new Node(ROOT_NODE_ID, MODE_DIRECTORY);
        directoryNode.links += 1;
        write_object(objectStore, directoryNode, directoryNode.id, write_directory_data);
      }
    };

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        write_object(objectStore, directoryData, directoryNode.data, callback);
      }
    };

    find_node(objectStore, ROOT_DIRECTORY_NAME, write_directory_node);
  }

  function make_directory(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function check_if_directory_exists(error, result) {
      if(!error && result) {
        callback(new EPathExists());
      } else if(error && !error instanceof ENoEntry) {
        callback(error);
      } else {
        find_node(objectStore, parentPath, read_parent_directory_data);
      }
    }

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        read_object(objectStore, parentDirectoryNode.data, write_directory_node);
      }
    };

    function write_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        directoryNode = new Node(undefined, MODE_DIRECTORY);
        directoryNode.links += 1;
        write_object(objectStore, directoryNode, directoryNode.id, write_directory_data);
      }
    };

    function write_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        directoryData = {};
        write_object(objectStore, directoryData, directoryNode.data, update_parent_directory_data);
      }
    };

    function update_parent_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData[name] = new DirectoryEntry(directoryNode.id, MODE_DIRECTORY);
        write_object(objectStore, parentDirectoryData, parentDirectoryNode.data, callback);
      }
    }

    find_node(objectStore, path, check_if_directory_exists);
  };

  function remove_directory(objectStore, path, callback) {
    path = normalize(path);
    var name = basename(path);
    var parentPath = dirname(path);

    var directoryNode;
    var directoryData;
    var parentDirectoryNode;
    var parentDirectoryData;

    function check_if_directory_exists(error, result) {
      if(error) {
        callback(error);
      } else if(!result) {
        callback(new ENoEntry());
      } else {
        directoryNode = result;
        read_object(objectStore, directoryNode.data, check_if_directory_is_empty);
      }
    }

    function check_if_directory_is_empty(error, result) {
      if(error) {
        callback(error);
      } else {
        directoryData = result;
        if(_(directoryData).size() > 0) {
          callback(new ENotEmpty());
        } else {
          find_node(objectStore, parentPath, read_parent_directory_data);
        }
      }
    };

    function read_parent_directory_data(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryNode = result;
        read_object(objectStore, parentDirectoryNode.data, remove_directory_entry_from_parent_directory_node);
      }
    };

    function remove_directory_entry_from_parent_directory_node(error, result) {
      if(error) {
        callback(error);
      } else {
        parentDirectoryData = result;
        delete parentDirectoryData[name];
        write_object(objectStore, parentDirectoryData, parentDirectoryNode.data, remove_directory_node);
      }
    };

    function remove_directory_node(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, directoryNode.id, remove_directory_data);
      }
    };

    function remove_directory_data(error) {
      if(error) {
        callback(error);
      } else {
        delete_object(objectStore, directoryNode.data, callback);
      }
    };

    find_node(objectStore, path, check_if_directory_exists);
  };

  return {
    make_directory: make_directory,
    make_root_directory: make_root_directory,
    remove_directory: remove_directory,
    find_node: find_node,
  };

});