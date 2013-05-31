define(function(require) {

  function Descriptor(db, id, flags, mode, size) {
    this.db = db;
    this.id = id;
    this.flags = flags;
    this.mode = mode;
    this.size = size || 0;
    this.position = 0;
  };

  return {
    Descriptor: Descriptor
  }

});