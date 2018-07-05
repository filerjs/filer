import { MODE_META } from "../common/constants";
import { SUPER_NODE_ID } from "../common/constants";
import UUID from "../common/uuid";

const __ = new WeakMap();

class SuperNodeData
{
	constructor({ dev, atime = Date.now(), mtime = Date.now(), ctime = Date.now(), rnode, version = UUID.short() } = {})
	{
		__.set(this, {
			dev: dev,
			mode: MODE_META,
			atime: atime || Date.now(), // access time (will mirror ctime after creation)
			mtime: mtime || Date.now(), // creation/change time
			ctime: ctime || Date.now(), // modified time
			rnode: rnode, // root node
			version: version,
		});
	}

	get dev() { return __.get(this).dev }

	get mode() { return __.get(this).mode }

	get atime() { return __.get(this).atime }
	set atime(value) { return __.get(this).atime = value }

	get mtime() { return __.get(this).mtime }
	set mtime(value) { return __.get(this).mtime = value }

	get ctime() { return __.get(this).ctime }
	set ctime(value) { return __.get(this).ctime = value }

	get version() { return __.get(this).version }
	set version(value) { return __.get(this).version = value }

	get rnode() { return __.get(this).rnode }
	set rnode(value) { return __.get(this).rnode = value }

	toJSON()
	{
		return {
			dev: this.dev,
			mode: this.mode,
			atime: this.atime,
			mtime: this.mtime,
			ctime: this.ctime,
			rnode: this.rnode,
			version: this.version,
		};
	}
}

class SuperNode
{
	constructor({ fs, data } = {})
	{
		__.set(this, {
			fs: fs,
			id: SUPER_NODE_ID,			

			data: new SuperNodeData(data),
		});
	}

	get id() { return __.get(this).id }

	get fs() { return __.get(this).fs }

	get dev() {	return __.get(this).data.dev }

	get mode() { return __.get(this).data.mode }

	get atime() { return __.get(this).data.atime }
	set atime(value) { return __.get(this).data.atime = value }

	get mtime() { return __.get(this).data.mtime }
	set mtime(value) { return __.get(this).data.mtime = value }

	get ctime() { return __.get(this).data.ctime }
	set ctime(value) { return __.get(this).data.ctime = value }	

	get rnode() { return __.get(this).data.rnode }
	set rnode(value) { return __.get(this).data.rnode = value }

	get version() { return __.get(this).data.version }
	set version(value) { return __.get(this).data.version = value }

	get data() { return __.get(this).data.toJSON() }

	static async read(fs)
	{
		let data = await fs.readNode(SUPER_NODE_ID);
		return new SuperNode({ fs: fs, data: data });
	}

	async read()
	{
		let data = await this.fs.readNode(this.id);
		__.get(this).data = new SuperNodeData(data);
	}

	async write()
	{
		this.version = UUID.short();
		await fs.writeNode(this.id, this.data);
	}

	toJSON()
	{
		return {
			id: this.id,
			data: __.get(this).data.toJSON(),
		}
	}	

	toString()
	{
		return JSON.stringify(this.toJSON());
	}
}

export default SuperNode;