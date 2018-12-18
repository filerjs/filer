#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Filer's path messes with process.cwd(), cache the real one
const cwd = process.cwd();

const path = require('path');
const fs = require('fs');
const { S_IFMT }  = fs.constants;
const SerializableMemoryProvider = require('../tests/lib/serializable-memory-provider');
const unusedFilename = require('unused-filename');
const prettyBytes = require('pretty-bytes');
const walk = require('walk');
const meow = require('meow');

const cli = meow(`
	Usage
    $ fs-image <input-dir> [<output-filename>] [--verbose] [--filer path/to/filer.js]

  Options
    --filer, -f    Specify a Filer module path to use. Defaults to current.
    --verbose, -v  Verbose logging

  Examples
    $ fs-image files/ files.json
    $ fs-image files/
    $ fs-image files/ existing.json --verbose
    $ fs-image files/ --filer ./versions/filer-0.44.js
`, {
  description: 'Create a Filer Filesystem Image from a directory',
  flags: {
    verbose: {
      type: 'boolean',
      alias: 'v',
      default: false
    },
    filer: {
      type: 'string',
      alias: 'f'
    }
  }
});

// Get arg list, make sure we get a dir path argument
cli.flags.app = cli.input.slice(1);
if(!(cli.input && cli.input.length >= 1)) {
  console.error('Specify a directory path to use as the image source');
  process.exit(1);
}
const dirPath = path.normalize(cli.input[0]);
const exportFilePath = cli.input[1] ? path.normalize(cli.input[1]) : null;

// Log in verbose mode
const log = msg => {
  if(cli.flags.verbose) {
    console.log(msg);
  }
};

// Load the version of Filer specified, or use current version in tree (default).
let filerModulePath = cli.flags.filer ? path.resolve(cwd, cli.flags.filer) : '../';

// Make sure we have an existing dir as our root
fs.stat(dirPath, (err, stats) => {
  if(err || !(stats && stats.isDirectory())) {
    console.error(`Expected existing directory for dirpath: ${dirPath}`);
    process.exit(1);
  }

  let Filer;
  try {
    Filer = require(filerModulePath);
    log(`Using Filer module at path ${filerModulePath}`);
  } catch(e) {
    console.error(`Unable to load Filer module at ${filerModulePath}: ${e.message}`);
    process.exit(1);
  }

  // Create a filer instance with serializable provider, and start walking dir path
  const provider = new SerializableMemoryProvider();
  const filer = new Filer.FileSystem({provider});
  const walker = walk.walk(dirPath);

  // Convert a filesystem path into a Filer path, rooted in /
  const toFilerPath = fsPath => path.join('/', fsPath.replace(dirPath, ''));

  // Write a file to Filer, including various metadata from the file node
  const filerWriteFile = (filerPath, stats, data, callback) => {
    const error = err => console.error(`[Filer] ${err}`);

    // Mask out the type, we only care about the various permission bits
    const mode = stats.mode & ~S_IFMT;
    // Prefer Unix Timestamps ms
    const atimeMs = stats.atimeMs;
    const mtimeMs = stats.mtimeMs;
    const uid = stats.uid;
    const gid = stats.gid;

    filer.writeFile(filerPath, data, { mode }, (err) => {
      if(err) {
        error(`Error writing ${filerPath}: ${err.message}`);
        return callback(err);
      }

      filer.utimes(filerPath, atimeMs, mtimeMs, err => {
        if(err) {
          error(`Error writing ${filerPath}: ${err.message}`);
          return callback(err);
        }

        // Not all shipped versions of Filer had chown(), bail if not present
        if(typeof filer.chown !== 'function') {
          log(`  File Node: mode=${mode.toString('8')} atime=${atimeMs} mtime=${mtimeMs}`);
          return callback();
        }
      
        filer.chown(filerPath, stats.uid, stats.gid, err => {
          if(err) {
            error(`Error writing ${filerPath}: ${err.message}`);
            return callback(err);
          }

          log(`  File Node: mode=${mode.toString('8')} uid=${uid} gid=${gid} atime=${atimeMs} mtime=${mtimeMs}`);
          callback();
        });
      });
    });
  };

  // Process every file we find in dirpath
  walker.on('file', (root, fileStats, next) => {
    const filePath = path.join(root, fileStats.name);
    const filerPath = toFilerPath(filePath);
    log(`Writing file ${filePath} to ${filerPath} [${prettyBytes(fileStats.size)}]`);

    // TODO: deal with symlinks...

    fs.readFile(filePath, null, (err, data) => {
      if(err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
        return next(err);
      }

      filerWriteFile(filerPath, stats, data, next);
    });
  });

  // Process every dir we find in dirpath
  walker.on('directory', (root, dirStats, next) => {
    const dirPath = path.join(root, dirStats.name);
    const filerPath = toFilerPath(dirPath);

    log(`Creating dir ${dirPath} in ${filerPath}`);
    filer.mkdir(filerPath, err => {
      if(err && err.code !== 'EEXIST') {
        console.error(`[Filer] Unable to create dir ${filerPath}: ${err.message}`);
        return next(err);
      }
      next();
    });
  });

  // When we're done processing entries, serialize filesystem to .json
  walker.on('end', () => {
    const writeFile = filename => {
      fs.writeFile(filename, provider.export(), err => {
        if(err) {
          console.error(`Error writing exported filesystem: ${err.message}`);
          process.exit(1);
        }
        console.log(`Wrote filesystem JSON to ${filename}`);
        process.exit(0);
      });
    };

    // If we have an explicit filename to use, use it.  Otherwise
    // generate a new one like `filesystem (2).json`
    if(exportFilePath) {
      writeFile(exportFilePath);
    } else {
      unusedFilename('filesystem.json').then(filename => writeFile(filename));
    }
  });
});
