import UUID from "../common/uuid";

const __ = new WeakMap();

class FS
{
	constructor(superNode, options)
	{
		let { proxy, revoke } = Proxy.revocable(this, {});

		__.set(proxy, {
			id: UUID.short(),	// instance ID
			revoke: revoke,
		});

		return proxy;
	}	

	get id()
	{
		return __.get(this).id;
	}

	static async mount(dev, flags=[], options={})
	{

	}

	async umount()
	{
		__.get(this).revoke();
	}

	toString()
	{
		return this.id;
	}
}

export default FS;