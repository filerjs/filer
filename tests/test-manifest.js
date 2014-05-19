define([

  /**
   * Add your test spec files to the list in order to
   * get them running by default.
   */

  // Filer
  "spec/filer.spec",

  // Filer.FileSystem.*
  "spec/fs.spec",
  "spec/fs.stat.spec",
  "spec/fs.lstat.spec",
  "spec/fs.exists.spec",
  "spec/fs.mknod.spec",
  "spec/fs.mkdir.spec",
  "spec/fs.readdir.spec",
  "spec/fs.rmdir.spec",
  "spec/fs.open.spec",
  "spec/fs.write.spec",
  "spec/fs.writeFile-readFile.spec",
  "spec/fs.appendFile.spec",
  "spec/fs.read.spec",
  "spec/fs.close.spec",
  "spec/fs.link.spec",
  "spec/fs.unlink.spec",
  "spec/fs.rename.spec",
  "spec/fs.lseek.spec",
  "spec/fs.symlink.spec",
  "spec/fs.readlink.spec",
  "spec/fs.truncate.spec",
  "spec/fs.utimes.spec",
  "spec/fs.xattr.spec",
  "spec/fs.stats.spec",
  "spec/path-resolution.spec",
  "spec/times.spec",
  "spec/time-flags.spec",
  "spec/fs.watch.spec",
  "spec/errors.spec",
  "spec/lib.spec",

  // Filer.FileSystem.providers.*
  "spec/providers/providers.spec",
  "spec/providers/providers.memory.spec",
  "spec/providers/providers.indexeddb.spec",
  "spec/providers/providers.websql.spec",

  // Filer.FileSystem.adapters.*
  "spec/adapters/adapters.spec",
  "spec/adapters/adapters.general.spec",

  // Filer.FileSystemShell.*
  "spec/shell/cd.spec",
  "spec/shell/touch.spec",
  "spec/shell/exec.spec",
  "spec/shell/cat.spec",
  "spec/shell/ls.spec",
  "spec/shell/rm.spec",
  "spec/shell/env.spec",
  "spec/shell/mkdirp.spec",
  "spec/shell/wget.spec",
  "spec/shell/zip-unzip.spec",

  // Ported node.js tests (filenames match names in https://github.com/joyent/node/tree/master/test)
  "spec/node-js/simple/test-fs-mkdir",
  "spec/node-js/simple/test-fs-null-bytes",
  "spec/node-js/simple/test-fs-watch",
  "spec/node-js/simple/test-fs-watch-recursive",

  // Regressions, Bugs
  "bugs/issue105",
  "bugs/issue106"

]);
