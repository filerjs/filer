const MemoryProvider = require('../../src/providers/memory');
const { parseBJSON } = require('../lib/test-utils');

class ImportExportProvider extends MemoryProvider {

  constructor(name, jsonImage) {
    super(name);
    this.unparsedJSONImage = jsonImage;
  }

  /**
   * In addition to the usual setup of a Memory provider,
   * also parse and overwrite the internal database.
   */
  open(callback) {
    super.open(err => {
      if(err) {
        return callback(err);
      }

      try {
        this.db = parseBJSON(this.unparsedJSONImage);
        this.unparsedJSONImage = null;
        callback();
      } catch(e) {
        callback(new Error(`unable to parse JSON filesystem image: ${e.message}`));
      }
    });
  }

  export() {
    return JSON.stringify(this.db);
  }
}

module.exports = ImportExportProvider;
