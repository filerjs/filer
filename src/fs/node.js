import UUID from "../common/uuid";
import { MODE_FILE, MODE_DIRECTORY, MODE_SYMBOLIC_LINK } from "../common/constants";
import Buffer from "../common/buffer";
import E from "../common/errors";

const __ = new WeakMap();

class NodeData
{
	constructor({ mode, size = 0, atime, mtime, ctime, version = UUID.short(), flags, xattrs, nlinks, blksize, nblocks, blkid = UUID.short() })
	{
		__.set(this, {
			mode: mode, // node type (file, directory, etc)
			size: size,
			atime: atime || Date.now(), // access time (will mirror ctime after creation)
			mtime: mtime || Date.now(), // creation/change time
			ctime: ctime || Date.now(), // modified time
			version: version || UUID.short(),
			flags: flags || [],
			xattrs: xattrs || {},
			nlinks: nlinks || 0,
			blksize: blksize || 4096,
			nblocks: nblocks || 0,
			blkid: blkid,
		});
	}

	get mode() { return __.get(this).mode }

	get atime() { return __.get(this).atime }
	set atime(value) { return __.get(this).atime = value }

	get mtime() { return __.get(this).mtime }
	set mtime(value) { return __.get(this).mtime = value }

	get ctime() { return __.get(this).ctime }
	set ctime(value) { return __.get(this).ctime = value }

	get version() { return __.get(this).version }
	set version(value) { return __.get(this).version = value }

	get flags() { return __.get(this).flags }
	
	get xattrs() { return __.get(this).xattrs }

	get nlinks() { return __.get(this).nlinks }
	set nlinks(value) { return __.get(this).nlinks = value }

	get blksize() { return __.get(this).blksize }
	
	get nblocks() { return __.get(this).nblocks }
	set nblocks(value) { return __.get(this).nblocks = value }

	get blkid() { return __.get(this).blkid }
	set blkid(value) { return __.get(this).blkid = value }

	get size() { return __.get(this).size }
	set size(value) { return __.get(this).size = value }	

	toJSON()
	{
		return {
			mode: this.mode,
			size: this.size,
			atime: this.atime,
			mtime: this.mtime,
			ctime: this.ctime,
			nlinks: this.nlinks,
			version: this.version,
			blksize: this.blksize,
			nblocks: this.nblocks,
			blkid: this.blkid,
			flags: this.flags,
			xattrs: this.xattrs,
		};
	}	
}

class Node
{
	constructor({ fs, id = UUID.short(), data } = {})
	{
		__.set(this, {
			fs: fs,
			id: id,			

			data: new NodeData(data),
		});
	}

	get fs() { return __.get(this).fs }

	get id() { return __.get(this).id }
	
	get size() { return __.get(this).data.size }
	set size(value) { return __.get(this).data.size = value }

	get nlinks() { return __.get(this).data.nlinks }
	set nlinks(value) { return __.get(this).data.nlinks = value }

	get version() { return __.get(this).data.version }
	set version(value) { return __.get(this).data.version = value }

	get blksize() { return __.get(this).data.blksize }

	get nblocks() {	return __.get(this).data.nblocks	}
	set nblocks(value) { return __.get(this).data.nblocks = value }

	get atime()	{ return __.get(this).data.atime }
	set atime(value) { return __.get(this).data.atime = value }

	get mtime() { return __.get(this).data.mtime }
	set mtime(value) { return __.get(this).data.mtime = value }

	get ctime() { return __.get(this).data.ctime }
	set ctime(value) { return __.get(this).data.ctime = value }

	get mode() { return __.get(this).data.mode }

	get blkid() { return __.get(this).data.blkid }
	set blkid(value) { return __.get(this).data.blkid = value }

	get flags() { return __.get(this).data.flags }

	get xattrs() { return __.get(this).data.xattrs }

	get data() { return __.get(this).data.toJSON() }

	isFile() 
	{ 
		return MODE_FILE == this.mode;
	}

	isDirectory() 
	{
		return MODE_DIRECTORY == this.mode;
	}

	isSymbolicLink()
	{
		return MODE_SYMBOLIC_LINK == this.mode;
	}

	isSocket()
	{
		return MODE_SOCKET == this.mode;
	}

	isFIFO()
	{
		return MODE_FIFO == this.mode;
	}

	isCharacterDevice()
	{
		return MODE_CHARACTER_DEVICE == this.mode;
	}

	isBlockDevice()
	{
		return MODE_BLOCK_DEVICE == this.mode;
	}

	toString()
	{
		return JSON.stringify(this.toJSON());
	}

	static hash(fs, id)
	{
		return `${fs.id}${id}`;
	}

	hash()
	{
		return Node.hash(this.fs, this.id);
	}

	static async read(fs, id)
	{
		let data = await fs.readNode(id);
		return new Node({ fs: fs, id: id, data: data });
	}

	async read()
	{
		let data = await this.fs.readNode(this.id);
		__.get(this).data = new NodeData(data);
	}

	async write()
	{
		this.version = UUID.short();
		return await this.fs.writeNode(this.id, this.data);
	}

	async readData(block=0)
	{
		let data = await this.fs.readData(this.blkid, block);

		return data;
	}

	async writeData(block=0, data)
	{
		this.nblocks = block + 1;
		await this.fs.writeData(this.blkid, block, data);
	}

	async validate()
	{
		
	}

	toJSON()
	{
		return {
			fs: this.fs.id,
			id: this.id,
			data: __.get(this).data.toJSON(),
		}
	}	

	toString()
	{
		return JSON.stringify(this.toJSON());
	}
}

export default Node;