define(function(require) {
  return {
    IndexedDB: require('src/providers/indexeddb'),
    Memory: require('src/providers/memory'),
    Default: require('src/providers/indexeddb')
  };
});
