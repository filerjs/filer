/**
 * Add your test spec files to the list in order to
 * get them running by default.
 */

// Filer
require('./spec/filer.spec');
require('./spec/filer.buffer.spec.js');

// Filer.FileSystem.*
require('./spec/filer.filesystem.spec');
require('./spec/fs.spec');
require('./spec/fs.access.spec');
require('./spec/fs.stat.spec');
require('./spec/fs.lstat.spec');
require('./spec/fs.exists.spec');
require('./spec/fs.mknod.spec');
require('./spec/fs.mkdir.spec');
require('./spec/fs.mkdtemp.spec');
require('./spec/fs.readdir.spec');
require('./spec/fs.rmdir.spec');
require('./spec/fs.open.spec');
require('./spec/fs.write.spec');
require('./spec/fs.writeFile-readFile.spec');
require('./spec/fs.appendFile.spec');
require('./spec/fs.read.spec');
require('./spec/fs.close.spec');
require('./spec/fs.fsync.spec');
require('./spec/fs.link.spec');
require('./spec/fs.unlink.spec');
require('./spec/fs.rename.spec');
require('./spec/fs.lseek.spec');
require('./spec/fs.symlink.spec');
require('./spec/fs.readlink.spec');
require('./spec/fs.truncate.spec');
require('./spec/fs.ftruncate.spec');
require('./spec/fs.utimes.spec');
require('./spec/fs.xattr.spec');
require('./spec/path-resolution.spec');
require('./spec/trailing-slashes.spec');
require('./spec/times.spec');
require('./spec/time-flags.spec');
require('./spec/fs.watch.spec');
require('./spec/fs.unwatchFile.spec');
require('./spec/errors.spec');
require('./spec/fs.shell.spec');
require('./spec/fs.chmod.spec');
require('./spec/fs.chown.spec');
require('./spec/fs.copyFile.spec');

// Filer.FileSystem.providers.*
require('./spec/providers/providers.spec');
require('./spec/providers/providers.indexeddb.spec');
require('./spec/providers/providers.memory.spec');
require('./spec/providers/serializable-memory-provider.spec');

// Filer.FileSystemShell.*
require('./spec/shell/cd.spec');
require('./spec/shell/touch.spec');
require('./spec/shell/exec.spec');
require('./spec/shell/cat.spec');
require('./spec/shell/ls.spec');
require('./spec/shell/rm.spec');
require('./spec/shell/env.spec');
require('./spec/shell/mkdirp.spec');
require('./spec/shell/find.spec');

// Ported node.js tests (filenames match names in https://github.com/joyent/node/tree/master/test)
require('./spec/node-js/simple/test-fs-mkdir');
require('./spec/node-js/simple/test-fs-null-bytes');
require('./spec/node-js/simple/test-fs-watch');
require('./spec/node-js/simple/test-fs-watch-recursive');

// Regressions, Bugs
require('./bugs/issue105');
require('./bugs/issue106');
require('./bugs/issue239');
require('./bugs/issue249');
require('./bugs/ls-depth-bug');
require('./bugs/issue247.js');
require('./bugs/issue254.js');
require('./bugs/issue258.js');
require('./bugs/issue267.js');
require('./bugs/issue270.js');
require('./bugs/rename-dir-trailing-slash.js');
require('./bugs/issue357.js');

// Sample code from README
require('./spec/readme.example.spec');
