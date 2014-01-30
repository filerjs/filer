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
  "spec/path-resolution.spec",

  // Filer.FileSystem.providers.*
  "spec/providers/providers.spec",
  "spec/providers/providers.memory.spec",
  "spec/providers/providers.indexeddb.spec",
  "spec/providers/providers.websql.spec",

  // Filer.FileSystem.adapters.*
  "spec/adapters/adapters.spec",
  "spec/adapters/adapters.general.spec",

  // Ported node.js tests (filenames match names in https://github.com/joyent/node/tree/master/test)
  "spec/node-js/simple/test-fs-mkdir",
  "spec/node-js/simple/test-fs-null-bytes"

]);
