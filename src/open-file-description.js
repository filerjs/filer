const Errors = require('./errors.js');
const Node = require('./node');

function OpenFileDescription(path, id, flags, position) {
  this.path = path;
  this.id = id;
  this.flags = flags;
  this.position = position;
}

// Tries to find the node associated with an ofd's `id`.
// If not found, an error is returned on the callback.
OpenFileDescription.prototype.getNode = function(context, callback) {
  var id = this.id;
  var path = this.path;

  function check_if_node_exists(error, node) {
    if(error) {
      return callback(error);
    }

    if(!node) {
      return callback(new Errors.EBADF('file descriptor refers to unknown node', path));
    }

    Node.create(node, callback);
  }

  context.getObject(id, check_if_node_exists);
};

module.exports = OpenFileDescription;
