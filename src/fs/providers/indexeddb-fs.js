import FS from "../index";
import SuperNode from "../super-node";
import Node from "../node";
import UUID from "../../common/uuid";
import E from "../../common/errors";
import { MODE_FILE, MODE_DIRECTORY, DATA_BLOCK_SEPARATOR } from "../../common/constants";
import Buffer from "../../common/buffer";

const __ = new WeakMap();

class IDBFS extends FS
{
	constructor(superNode, options={})
	{		
		
	}

	static get type()
	{
		return "idbfs";
	}

	static async mount(dev=UUID.short(), flags=[], options={})
	{
		
	}

	async umount()
	{
		super.umount();
	}

	async readNode(id)
	{
	}

	async writeNode(id, node)
	{
	}

	async readData(id, block=0, mode=MODE_FILE)
	{
	}

	async writeData(id, block, data)
	{
	}

	async fsync()
	{
	}

	async validate(id)
	{
	}
}

export default IDBFS;