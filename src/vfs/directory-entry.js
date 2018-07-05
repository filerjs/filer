import { MODE_FILE } from "../common/constants";

const __ = new WeakMap();

class DirectoryEntry
{
	constructor({ id, type=MODE_FILE } = {})
	{
		__.set(this, {
			id: id,
			type: type,
		});
	}

	get id() { return __.get(this).id }

	get type() { return __.get(this).type }
}

export default DirectoryEntry;