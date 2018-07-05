import FDMap from "./fdmap";
import VFSMount from "./vfsmount";
import RootFS from "../fs/providers/root-fs";
import { check as pathCheck, normalize, basename, dirname } from "../common/path";
import { ROOT_DIRECTORY_NAME } from "../common/constants";
import Providers from "../fs/providers/index";
import E from "../common/errors";
import { SUPER_NODE_ID } from "../common/constants";
import { MNT_READ_ONLY } from "../common/constants";
import { SYMLOOP_MAX } from "../common/constants";
import { MODE_FILE, MODE_DIRECTORY, MODE_SYMBOLIC_LINK } from "../common/constants";
import UUID from "../common/uuid";
import DirectoryEntry from "./directory-entry";
import Node from "../fs/node";
import SuperNode from "../fs/super-node";
import URL from "../common/url";

const __ = new WeakMap();

class InternalVFS
{
	constructor()
	{
		const rootFS = new RootFS();
		const rootFSVFSMount = new VFSMount({ fs: rootFS, flags: [ MNT_READ_ONLY ] })		
		const fsVFSMounts = new WeakMap();
		fsVFSMounts.set(rootFS, rootFSVFSMount);

		__.set(this, {
			fdMap: new FDMap(),

			vfsMountsRoot: rootFSVFSMount,
			fsVFSMounts: fsVFSMounts,
			vfsMounts: new Map(),
		});
	}

	async findNode({path, followSymlinks = true} = {}, context)
	{
		const self = __.get(this);

		if(!context) {
			context = { symlinksFollowed: 0 };
		}

		path = normalize(path);
		if(!path) {
	    	throw new E.ENOENT("path is an empty string");
	  	}

		let name = basename(path);
		let parentPath = dirname(path);

		let fs;
		let nodeId;
		if(ROOT_DIRECTORY_NAME == name) {
			fs = self.vfsMountsRoot.fs;
			let superNode = await SuperNode.read(fs);
			nodeId = superNode.rnode;
		} else {
			let parentDirectoryNode = await this.findNode({ path: parentPath }, context);
			fs = parentDirectoryNode.fs;

			if(parentDirectoryNode.mode !== MODE_DIRECTORY) {
				throw new E.ENOTDIR("a component of the path prefix is not a directory", path);
			}

			let parentDirectoryData;
			try {
				parentDirectoryData = await parentDirectoryNode.readData();
			} catch(error) {
				parentDirectoryData = new Object();
			}

			if(!parentDirectoryData.hasOwnProperty(name)) {
				throw new E.ENOENT(null, path);
			}

			let directoryEntry = new DirectoryEntry(parentDirectoryData[name]);
			nodeId = directoryEntry.id;
		}

		// Follow all vfsMounts on this node.
		let nodeHash = Node.hash(fs, nodeId);
		while(self.vfsMounts.has(nodeHash)) {
			let vfsMount = (self.vfsMounts.get(nodeHash))[0];
			fs = vfsMount.fs;

			if(vfsMount.rnode) {
				nodeId = vfsMount.rnode;
			} else {
				let superNode = await SuperNode.read(fs);
				nodeId = superNode.rnode;
			}

			nodeHash = Node.hash(fs, nodeId);
		}		

		let node = await Node.read(fs, nodeId);

		if(node.mode == MODE_SYMBOLIC_LINK) {
			context.symlinksFollowed += 1;

			if(context.symlinksFollowed > SYMLOOP_MAX) {
				throw new E.ELOOP(null, path);
			}

			let symlinkPath = await node.readData();
			node = await this.findNode({ path: symlinkPath }, context);
		}

		return node;
	}

	async mount(fsURL, mountPath, flags, options)
	{
		const self = __.get(this);

		let mountPoint = await this.findNode({ path: mountPath });

		if(!mountPoint) {
			throw new E.ENOENT("mount target does not exist");
		}

		let url = new URL(fsURL);

		if("filer" !== url.protocol) {
			throw new E.UNKNOWN("expecting filer protocol");
		}

		let dev = url.path.slice(1);
		let type = url.subprotocol;
		
		if(!(type in Providers)) {
			throw new E.UNKNOWN("unknown file system type");
		}

		let fs = await Providers[type].mount(dev, flags, options);
		let superNode = await fs.readNode(SUPER_NODE_ID);
		let rootNode = await fs.readNode(superNode.rnode);

		let vfsMount = new VFSMount({ parent: self.fsVFSMounts.get(mountPoint.fs), flags: flags, fs: fs });
		self.fsVFSMounts.set(fs, vfsMount);

		if(!self.vfsMounts.has(mountPoint.hash())) {
			self.vfsMounts.set(mountPoint.hash(), new Array());
		}
		self.vfsMounts.get(mountPoint.hash()).unshift(vfsMount);
	}

	async umount(path)
	{
		const self = __.get(this);

		let mountNode = await this.findNode({ path: path });
		let fs = mountNode.fs;

		
	}

	open(path, flags, mode, callback)
	{

	}

	close(fd, callback)
	{

	}

	mknod(path, mode, callback)
	{

	}

	async mkdir(path, mode)
	{
		path = normalize(path);

		let name = basename(path);
		let parentPath = dirname(path);

		let directoryNode;
		try {
			directoryNode = await this.findNode({ path: path });
		} catch(error) {
			directoryNode = null;
		}

		if(directoryNode) {
			console.log(directoryNode.toJSON());
			throw new E.EEXIST(null, path);
		}

		let parentDirectoryNode = await this.findNode({ path: parentPath });
		let fs = parentDirectoryNode.fs;

		let parentDirectoryData
		try {
			parentDirectoryData = await parentDirectoryNode.readData();
		} catch(error) {
			parentDirectoryData = new Object();
		}

		directoryNode = new Node({ fs: fs, data: { mode: MODE_DIRECTORY, nlinks: 1, data: UUID.short() } });		
		directoryNode.write();

		let directoryData = new Object();
		await directoryNode.writeData(0, directoryData);

		// ! update node a/c/m times

		parentDirectoryData[name] = new DirectoryEntry({ id: directoryNode.id, type: MODE_DIRECTORY });		
		await parentDirectoryNode.writeData(0, parentDirectoryData);

		parentDirectoryNode.size = Object.keys(parentDirectoryData).length;
		await parentDirectoryNode.write();
	}

	async readdir(path)
	{
		pathCheck(path);

		let directoryNode = await this.findNode({ path: path });
		let directoryData;
		try {
			directoryData = await directoryNode.readData();
		} catch(error) {
			if(error instanceof E.EIO)
				directoryData = new Object();
		}

		let files = Object.keys(directoryData);
		return files;
	}

	rmdir(path, callback)
	{

	}

	stat(path, callback)
	{

	}

	fstat(fd, callback)
	{

	}

	link(oldpath, newpath, callback)
	{

	}

	unlink(path, callback)
	{

	}

	read(fd, buffer, offset, length, position, callback)
	{

	}

	readFile(path, options, callback)
	{

	}

	write(fd, buffer, offset, length, position, callback)
	{

	}

	writeFile(path, data, options, callback)
	{

	}

	appendFile(path, data, options, callback)
	{

	}

	exists(path, callback)
	{

	}

	getxattr(path, name, callback)
	{

	}

	fgetxattr(fd, name, callback)
	{

	}

	setxattr(path, name, value, flag, callback)
	{

	}

	fsetxattr(fd, name, value, flag, callback)
	{

	}

	removexattr(path, name, callback)
	{

	}

	fremovexattr(fd, name, callback)
	{

	}

	lseek(fd, offset, whence, callback)
	{

	}	

	utimes(path, atime, mtime, callback)
	{

	}

	futimes(fd, atime, mtime, callback)
	{

	}

	rename(oldpath, newpath, callback)
	{

	}

	symlink(srcpath, dstpath, type, callback)
	{

	}

	readlink(path, callback)
	{

	}

	lstat(path, callback)
	{

	}

	truncate(path, length, callback)
	{

	}

	ftruncate(fd, length, callback)
	{

	}
};

class VFS
{
	constructor()
	{
		__.set(this, {
			vfs: new InternalVFS(),
		});
	}

	async mount(...args) { return await __.get(this).vfs.mount(...args); }

	async umount(...args) { return await __.get(this).vfs.umount(...args); }

	async mkdir(...args) { return await __.get(this).vfs.mkdir(...args); }

	async readdir(...args) { return await __.get(this).vfs.readdir(...args); }
}

export default VFS;