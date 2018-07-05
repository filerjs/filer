const __ = new WeakMap();

class LRUEntry
{
	constructor(key, value)
	{
		__.set(this, {
			key: key,
			value: value,
			older: null,
			newer: null,
		});
	}

	get key()
	{
		return __.get(this).key;
	}

	get value()
	{
		return __.get(this).value;
	}
}

class LRUMap
{
	constructor(limit)
	{
		__.set(this, {
			size: 0,
			limit: limit,
			oldest: null,
			keyMap: new Map(),
		});
	}
}

class NodeCache
{
	constructor(limit=1024)
	{
		__.set(this, {
			nodes: {},
			lru: [],			
		});
	}

	insert(node, hash)
	{
		__.get(this).nodes[hash] = node;
	}

	remove(hash)
	{
		delete __.get(this).nodes[hash];
	}

	find(hash)
	{
		return __.get(this).nodes[hash] || null;
	}
}

export default NodeCache;