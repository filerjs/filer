const log = console.log;
const Filer = require("../dist/filer");

let vfs = new Filer.VFS();

(async () => {
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.mount(`filer+memfs:///${Filer.UUID.v4()}`, "/");
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.mkdir("/test1");
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.mkdir("/test2");
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.mount(`filer+memfs:///${Filer.UUID.v4()}`, "/");
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.mkdir("/test3");
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.mkdir("/test4");
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);

	await vfs.umount("/");	
	log(`root directory contents: ${JSON.stringify(await vfs.readdir("/"))}`);
})();