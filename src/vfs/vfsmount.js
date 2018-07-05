const __ = new WeakMap();

class VFSMount
{
	constructor({ parentVFSMount = null, flags = [], fs, rnode = null } = {})
	{
		__.set(this, {
			flags: flags,
			fs: fs,
			rnode: rnode,

			parent: parentVFSMount,
			children: new Set(),
		});

		if(parentVFSMount) {
			parentVFSMount.insertChild(this);
		}
	}

	get fs() { return __.get(this).fs }

	get rnode() { return __.get(this).rnode }

	get flags() { return __.get(this).flags }

	get parent() { return __.get(this).parent }

	get children() { return __.get(this).children }

	hasChildren()
	{
		const self = __.get(this);

		return this.children.size > 0;
	}

	insertChild(vfsMount)
	{
		const self = __.get(this);
		
		self.children.add(vfsMount);
	}

	removeChild(vfsMount)
	{
		const self = __.get(this);

		self.children.delete(vfsMount);
	}
};

export default VFSMount;