let fs = null;
let Filer = null;

module.exports = Filer = {
  FileSystem: require('./filesystem/interface.js'),
  Buffer: Buffer,
  Path: require('./path.js'),
  Errors: require('./errors.js'),
  Shell: require('./shell/shell.js')
};

// Add a getter for the `fs` instance, which returns
// a Filer FileSystem instance, using the default provider/flags.
Object.defineProperty(Filer, 'fs', {
  enumerable: true,
  get() {
    if(!fs) {
      fs = new Filer.FileSystem();
    }
    return fs;
  }
});
