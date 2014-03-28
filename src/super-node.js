define(['src/constants', 'src/shared'], function(Constants, Shared) {

  return function SuperNode(atime, ctime, mtime) {
    var now = Date.now();

    this.id = Constants.SUPER_NODE_ID;
    this.mode = Constants.MODE_META;
    this.atime = atime || now;
    this.ctime = ctime || now;
    this.mtime = mtime || now;
    this.rnode = Shared.guid(); // root node id (randomly generated)
  };

});
