'use strict';
const expect = require('chai').expect;
const utils = require('../../lib/test-utils');
const FilerWebpackPlugin = require('../../../src/webpack-plugin/plugin');

function createNMFResolveCompilerObject(resolveData) {

  const normalModuleFactory_resolve_tap = utils.createMockFn(function (name, callback) {
    callback(resolveData);
  });

  const normalModuleFactory = {
    hooks: {
      resolve: {
        tap: normalModuleFactory_resolve_tap
      }
    }
  }

  const normalModuleFactory_tap = utils.createMockFn(function (name, callback) {
    callback(normalModuleFactory);
  });

  const compiler = {
    hooks: {
      normalModuleFactory: {
        tap: normalModuleFactory_tap,
      }
    }
  }

  return {
    compiler,
    normalModuleFactory_tap,
    normalModuleFactory_resolve_tap,
  }
}

describe.only('path shim', () => {
  it('should instantiate the plugin with valid options', () => {
    // Arrange
    const options = {
      filerDir: '/filer',
      shimsDir: '/shims',
      fsProviderDir: '/fsProvider',
      shimFs: false,
      shimPath: false,
      fsProvider: 'custom',
    };

    // Act
    const plugin = new FilerWebpackPlugin(options);

    // Assert
    expect(plugin.options).to.not.be.undefined;

    expect(plugin.options.filerDir).to.equal(options.filerDir);
    expect(plugin.options.shimsDir).to.equal(options.shimsDir);
    expect(plugin.options.fsProviderDir).to.equal(options.fsProviderDir);
    expect(plugin.options.shimFs).to.equal(options.shimFs);
    expect(plugin.options.shimPath).to.equal(options.shimPath);
    expect(plugin.options.fsProvider).to.equal(options.fsProvider);
  });

  it('should instantiate the plugin with default options', () => {
    // Act
    const plugin = new FilerWebpackPlugin();

    // Assert
    expect(plugin.options).to.not.be.undefined;

    expect(plugin.options.filerDir).to.equal('/node_modules/filer');
    expect(plugin.options.shimsDir).to.equal('/node_modules/filer/shims');
    expect(plugin.options.fsProviderDir).to.equal('/node_modules/filer/shims/providers');
    expect(plugin.options.shimFs).to.equal(true);
    expect(plugin.options.shimPath).to.equal(true);
    expect(plugin.options.fsProvider).to.equal('default');
  });

  it('should instantiate the plugin with invalid options', () => {
    // Arrange
    const options = {
      filerDir: 123,
      shimsDir: 456,
      fsProviderDir: 789,
      shimFs: 'false',
      shimPath: 'false',
      fsProvider: false,
    };

    // Act // Assert
    expect(() => {
      new FilerWebpackPlugin(options);
    }).to.throw();
  });

  it('should instantiate the plugin with options and the <rootDir> tag should be replaced', () => {
    // Arrange
    const options = {
      filerDir: '<rootDir>/filer',
      shimsDir: '<rootDir>/shims',
      fsProviderDir: '<rootDir>/fsProvider',
    };

    // Act
    const plugin = new FilerWebpackPlugin(options);

    // Assert
    expect(plugin.options).to.not.be.undefined;

    expect(plugin.options.filerDir).to.equal(options.filerDir.replace('<rootDir>', ''));
    expect(plugin.options.shimsDir).to.equal(options.shimsDir.replace('<rootDir>', ''));
    expect(plugin.options.fsProviderDir).to.equal(options.fsProviderDir.replace('<rootDir>', ''));
  });

  describe('should instantiate the plugin with valid options and invoke the apply method', () => {
    it('should ignore an unrelated module', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'aModuleWeDontCareAbout',
        context: '/some/random/directory',
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(resolveData.request);
    });

    it('should resolve fsProvider to <fsProviderDir>/default.js when fsProvider options is default', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'default',
      };

      const resolveData = {
        request: 'fsProvider',
        context: options.shimsDir,
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(`${options.fsProviderDir}/default.js`);
    });

    it('should resolve fsProvider to <fsProviderDir>/indexeddb.js when fsProvider options is indexeddb', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'indexeddb',
      };

      const resolveData = {
        request: 'fsProvider',
        context: options.shimsDir,
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(`${options.fsProviderDir}/indexeddb.js`);
    });

    it('should resolve fsProvider to <fsProviderDir>/memory.js when fsProvider options is memory', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'memory',
      };

      const resolveData = {
        request: 'fsProvider',
        context: options.shimsDir,
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(`${options.fsProviderDir}/memory.js`);
    });

    it('should resolve fsProvider to <fsProviderDir>/custom.js when fsProvider options is custom', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'fsProvider',
        context: options.shimsDir,
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(`${options.fsProviderDir}/custom.js`);
    });

    it('should throw an error when an invalid options is provided for fsProvider', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'invalid_fs_provider_option',
      };

      const resolveData = {
        request: 'fsProvider',
        context: options.shimsDir,
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);

      // Act // Assert
      expect(() => {
        plugin.apply(compiler);
      }).to.throw();
    });

    it('should ignore a request for fs when the context is in the filer directory', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'fs',
        context: options.filerDir + '/src',
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(resolveData.request);
    });

    it('should resolve a request for fs to the fs shim when the context is not in the filer directory', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: true,
        shimPath: true,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'fs',
        context: '/some/random/directory',
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(`${options.shimsDir}/fs.js`);
    });

    it('should not resolve a request for fs to the fs shim when the context is not in the filer directory but shimFs is false', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'fs',
        context: '/some/random/directory',
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(resolveData.request);
    });

    it('should resolve a request for path to the path shim when the context is not in the filer directory', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: true,
        shimPath: true,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'path',
        context: '/some/random/directory',
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(`${options.shimsDir}/path.js`);
    });

    it('should not resolve a request for path to the path shim when the context is not in the filer directory but shimPath is false', () => {
      // Arrange
      const options = {
        filerDir: '/filer',
        shimsDir: '/shims',
        fsProviderDir: '/fsProvider',
        shimFs: false,
        shimPath: false,
        fsProvider: 'custom',
      };

      const resolveData = {
        request: 'path',
        context: '/some/random/directory',
      };
      const resolveDataIn = Object.create(resolveData);

      // Mocks
      const {
        compiler,
        normalModuleFactory_tap,
        normalModuleFactory_resolve_tap,
      } = createNMFResolveCompilerObject(resolveDataIn);

      // Act
      const plugin = new FilerWebpackPlugin(options);
      plugin.apply(compiler);

      // Assert
      expect(normalModuleFactory_tap.calls).to.have.length(1);
      expect(normalModuleFactory_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(normalModuleFactory_resolve_tap.calls).to.have.length(1);
      expect(normalModuleFactory_resolve_tap.calls[0].args[0]).to.equal('filer-webpack-plugin');

      expect(resolveDataIn.request).to.equal(resolveData.request);
    });
  });
});
