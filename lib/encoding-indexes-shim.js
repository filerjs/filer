// Hack to allow using encoding.js with only utf8.
// Right now there's a bug where it expects global['encoding-indexes']:
//
//  function index(name) {
//    if (!('encoding-indexes' in global))
//      throw new Error("Indexes missing. Did you forget to include encoding-indexes.js?");
//    return global['encoding-indexes'][name];
//  }
(function(global) {
  global['encoding-indexes'] = global['encoding-indexes'] || [];
}(this));
