const { MODE_FILE, MODE_DIRECTORY, MODE_SYMBOLIC_LINK } = require(`../common/constants`);

const __ = new WeakMap();

class Stats
{
	constructor(fileNode, deviceName)
	{
		__.set(this, {
			node: fileNode.id,
			dev: deviceName,
			size: fileNode.size,
			nlinks: fileNode.nlinks,
			atime: fileNode.atime,
			mtime: fileNode.mtime,
			ctime: fileNode.ctime,
			type: fileNode.mode,
		});
	}

	get node()
	{
		return __.get(this).node;
	}

	get dev()
	{
		return __.get(this).dev;
	}

	get size()
	{
		return __.get(this).size;
	}

	get nlinks()
	{
		return __.get(this).nlinks;
	}

	get atime()
	{
		return __.get(this).atime;
	}

	get mtime()
	{
		return __.get(this).mtime;
	}

	get ctime()
	{
		return __.get(this).ctime;
	}

	get type()
	{
		return __.get(this).type;
	}

	get isFile()
	{
		return MODE_FILE == this.type;
	}

	get isDirectory()
	{
		return MODE_DIRECTORY == this.type;
	}

	get isSymbolicLink()
	{
		return MODE_SYMBOLIC_LINK == this.type;
	}

	get isSocket()
	{
		return MODE_SOCKET == this.type;
	}

	get isFIFO()
	{
		return MODE_FIFO == this.type;
	}

	get isCharacterDevice()
	{
		return MODE_CHARACTER_DEVICE == this.type;
	}

	get isBlockDevice()
	{
		return MODE_BLOCK_DEVICE == this.type;
	}
}

export default Stats;