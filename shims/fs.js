const { FileSystem } = require('../src/index');

let Provider;
try {
  Provider = require('fsProvider');
}
catch (err) {
  Provider = require('./providers/default');
}

const provider = new Provider();

let onFsReady;
let onFsError;

let fsReady = new Promise((resolve, reject) => {
  onFsReady = resolve;
  onFsError = reject;
});

var fsInstance = new FileSystem({ provider }, (err) => {
  if (err) {
    onFsError(err);
  } else {
    onFsReady(true);
  }
});

function proxyHasProp(target, prop) {
  return prop in target;
}

const fsPromises = new Proxy(fsInstance.promises, {
  get(target, prop) {
    if (!proxyHasProp(target, prop)) {
      return;
    }

    return async (...args) => {
      await fsReady;
      return await target[prop](...args);
    };
  },
});

const fs = new Proxy(fsInstance, {
  get(target, prop) {
    if (!proxyHasProp(target, prop)) {
      return;
    }

    if (prop === 'promises') {
      return fsPromises;
    }

    return (...args) => {
      (async () => {
        await fsReady;
        target[prop](...args);
      })();
    };
  },
});

module.exports = {
  __esModule: true,
  default: fs,
};
