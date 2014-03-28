define(function(require) {

  return function OpenFileDescription(path, id, flags, position) {
    this.path = path;
    this.id = id;
    this.flags = flags;
    this.position = position;
  };

});
