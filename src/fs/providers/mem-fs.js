import FS from "../index";
import SuperNode from "../super-node";
import Node from "../node";
import UUID from "../../common/uuid";
import E from "../../common/errors";
import { MODE_FILE, MODE_DIRECTORY, DATA_BLOCK_SEPARATOR } from "../../common/constants";
import Buffer from "../../common/buffer";

const __ = new WeakMap();

class MemFS extends FS
{
	constructor(options={})
	{		
		super(options);

		let storage = new Map();
		
		let superNode = new SuperNode({ fs: this });
		storage.set(superNode.id, superNode);

		let rootNode = new Node({ fs: this, data: { mode: MODE_DIRECTORY } });
		storage.set(rootNode.id, rootNode);

		superNode.rnode = rootNode.id;		

		__.set(this, {
			storage: storage,
		});
	}

	static get type()
	{
		return "memfs";
	}

	static async mount(dev=UUID.short(), flags=[], options={})
	{
		let fs = new MemFS();

		return fs;
	}

	async umount()
	{
		super.umount();
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
		__.get(this).storage.set(id, node);
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
		__.get(this).storage.set(`${id}${DATA_BLOCK_SEPARATOR}${block}`, data);
	}

	async fsync()
	{

	}

	async validate(id)
	{

	}
}

export default MemFS;