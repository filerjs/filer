import { FIRST_DESCRIPTOR, N_VFS_DESCRIPTORS, STDIN, STDOUT, STDERR } from "../common/constants";

const __ = new WeakMap();

class FDMap
{
	constructor(size=N_VFS_DESCRIPTORS)
	{
		const map = new Array(size).fill(0);

		map[STDIN] = 1;
		map[STDOUT] = 1;
		map[STDERR] = 1;

		__.set(this, {
			map: map,
			next: FIRST_DESCRIPTOR,
		});
	}

	claimUnused()
	{		
		const map = __.get(this).map;
		let next = __.get(this).next;

		for(let i = 0; i < map.length; ++ i)
		{
			let fd = (next+i) % map.length;
			if(0 == map[fd]) {
				this.claim(fd);
				return fd;
			}
		}

		throw new Error(`unable to allocate file descriptor`);
	}

	claim(fd)
	{		
		__.get(this).map[fd] = 1;
	}

	release(fd)
	{
		__.get(this).map[fd] = 0;
	}
}

export default FDMap;