const { EBADF } = require("../common/errors");

const __ = new WeakMap();

/* An open file. */
class File
{
	constructor(path, id, flags, position)
	{
		__.set(this, {
			path: path,
			id: id,
			flags: flags,
			position: position,
		});
	}

	read()
	{

	}

	write()
	{

	}
}

export default File;