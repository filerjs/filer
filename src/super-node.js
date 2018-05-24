var Constants = require('./constants.js');

function SuperNode(options) {
  var now = Date.now();

  this.id = Constants.SUPER_NODE_ID;
  this.type = Constants.NODE_TYPE_META;
  this.atime = options.atime || now;
  this.ctime = options.ctime || now;
  this.mtime = options.mtime || now;
  // root node id (randomly generated)
  this.rnode = options.rnode;
}

SuperNode.create = function(options, callback) {
  options.guid(function(err, rnode) {
    if(err) {
      callback(err);
      return;
    }
    options.rnode = options.rnode || rnode;
    callback(null, new SuperNode(options));
  });
};

module.exports = SuperNode;
