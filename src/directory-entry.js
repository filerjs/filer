define(['src/constants'], function(Constants) {

  return function DirectoryEntry(id, type) {
    this.id = id;
    this.type = type || Constants.MODE_FILE;
  };

});
