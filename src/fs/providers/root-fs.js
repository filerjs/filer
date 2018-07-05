import FS from "../fs";
import SuperNode from "../super-node";
import Node from "../node";
import UUID from "../../common/uuid";
import { MODE_DIRECTORY, MODE_FILE, DATA_BLOCK_SEPARATOR } from "../../common/constants";
import { SUPER_NODE_ID } from "../../common/constants";
import E from "../../common/errors";

const __ = new WeakMap();

/*
	RootFS is a read-only file system containing exactly one
	directory node. It is created automatically by the VFS
	layer. Its only purpose is to allow the VFS to mount another
	file system on top of its only node.
 */

class RootFS extends FS
{
	constructor(options={})
	{		
		super(options);

		let superNode = new SuperNode({ fs: this, data: { dev: UUID.short() } });

		let rootNode = new Node({ fs: this, data: { mode: MODE_DIRECTORY, nlinks: 1 } });
		superNode.rnode = rootNode.id;

		let storage = new Map();
		storage.set(superNode.id, superNode.data);
		storage.set(rootNode.id, rootNode.data);

		__.set(this, {
			storage: storage,
		});
	}

	static get type()
	{
		return "rootfs";
	}

	static async mount()
	{
		throw new E.UNKNOWN("mount operation not available for rootfs");
	}

	async umount()
	{
		throw new E.UNKNOWN("umount operation not available for rootfs");
	}	

	async readNode(id)
	{
		let node = __.get(this).storage.get(id);		

		if(!node) {
			throw new E.ENOENT();
		}

		return node;
	}

	async writeNode(id, node)
	{
		throw new E.EROFS();
	}

	async readData(id, block=0)
	{
		let data = __.get(this).storage.get(`${id}${DATA_BLOCK_SEPARATOR}${block}`);

		if(!data) {
			throw new E.EIO();
		}

		return data;
	}

	async writeData(id, block, data)
	{
		throw new E.EROFS();
	}

	async fsync()
	{

	}

	async validate(id)
	{

	}
}

export default RootFS;