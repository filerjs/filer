var path = require('path');
var utils = require('./utils');

const PLUGIN_NAME = 'filer-webpack-plugin';

const OPTIONS_SCHEMA = require('./schema');
const OPTIONS_PROCESSORS = require('./processors');

module.exports = class FilerWebpackPlugin {

  constructor(options = {}) {
    utils.validateOptions(options, OPTIONS_SCHEMA);
    this.options = utils.processOptions(options, OPTIONS_PROCESSORS);
  }

  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap(
      PLUGIN_NAME,
      (factory) => {
        factory.hooks.resolve.tap(
          PLUGIN_NAME,
          (resolveData) => {
            // Resolve fsProvider if required
            if (
              resolveData.request === 'fsProvider'
                            && resolveData.context === this.options.shimsDir
            ) {
              return this.resolveFsProvider(resolveData);
            }

            // Ignore filer files (these should resolve modules normally)
            if (resolveData.context.startsWith(this.options.filerDir)) return;

            // Apply fs, path and buffer shims if required
            switch (resolveData.request) {
            case 'fs':
              if (!this.options.shimFs) return;
              return this.applyFsShim(resolveData);
            case 'path':
              if (!this.options.shimPath) return;
              return this.applyPathShim(resolveData);
            case 'buffer':
              if (!this.options.shimBuffer) return;
              return this.applyBufferShim(resolveData);
            default:
              return;
            }
          }
        );
      },
    );
  }

  resolveFsProvider(resolveData) {
    switch (this.options.fsProvider) {
    case 'default':
      resolveData.request = path.join(this.options.fsProviderDir, 'default.js');
      break;
    case 'indexeddb':
      resolveData.request = path.join(this.options.fsProviderDir, 'indexeddb.js');
      break;
    case 'memory':
      resolveData.request = path.join(this.options.fsProviderDir, 'memory.js');
      break;
    case 'custom':
      resolveData.request = path.join(this.options.fsProviderDir, 'custom.js');
      break;
    default:
      throw new Error([
        'Invalid option for fsProvider.',
        'fsProvider must be one of \'default\', \'indexeddb\', \'memory\' or \'custom\'.',
        'If using a custom fsProvider, you must also provide the fsProviderDir option.'
      ].join(' '));
    }
  }

  applyFsShim(resolveData) {
    resolveData.request = path.join(this.options.shimsDir, 'fs.js');
  }
    
  applyPathShim(resolveData) {
    resolveData.request = path.join(this.options.shimsDir, 'path.js');
  }

  applyBufferShim(resolveData) {
    resolveData.request = path.join(this.options.shimsDir, 'buffer.js');
  }
};
