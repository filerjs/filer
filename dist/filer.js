(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Filer = factory());
}(this, (function () { 'use strict';

	class Platform
	{
		static supportsWebCrypto()
		{
			return ("undefined" !== typeof window && 
					"undefined" !== typeof window.crypto &&
					"function" === typeof window.crypto.getRandomValues);
		}

		static supportsNodeCrypto()
		{
			if("undefined" !== typeof process) {
				try {
					require.resolve("crypto");
					return true;
				} catch(e) {				
				}
			}

			return false;
		}
	}

	class FilerError extends Error
	{
		constructor(message, path = null)
		{
			super(message);

			this.path = path;
		}
	}

	const errors = {};
	const errorDefinitions = 
	[
		{ errno: -1, name: "UNKNOWN", text: "unknown error" },
		{ errno: 0, name: "OK", text: "success" },
		{ errno: 1, name: "EOF", text: "end of file" },

		{ errno: 9, name: "EBADF", text: "bad file descriptor" },
		{ errno: 10, name: "EBUSY", text: "resource busy or locked" },

		{ errno: 18, name: "EINVAL", text: "invalid argument" },

		{ errno: 27, name: "ENOTDIR", text: "not a directory" },
		{ errno: 28, name: "EISDIR", text: "illegal operation on directory" },

		{ errno: 34, name: "ENOENT", text: "no such file or directory" },

		{ errno: 47, name: "EEXIST", text: "file already exists" },

		{ errno: 50, name: "EPERM", text: "operation not permitted" },
		{ errno: 51, name: "ELOOP", text: "too many symbolic links encountered" },

		{ errno: 53, name: "ENOTEMPTY", text: "directory not empty" },

		{ errno: 55, name: "EIO", text: "i/o error" },
		{ errno: 56, name: "EROFS", text: "read-only file system" },
		{ errno: 57, name: "ENODEV", text: "no such device" },

		{ errno: 58, name: "ECANCELED", text: "operation canceled" },

		{ errno: 1000, name: "ENOTSUPPORTED", text: "platform is not supported" },
	];

	for (let error of errorDefinitions) {
		errors[error.errno] = errors[error.name] = class extends FilerError {
			constructor(message, path)
			{
				super(message || error.text, path);
			}

			get name() { return error.name }

			get code() { return error.name }

			get errno() { return error.errno }

			get message() { return this.message }		

			get stack() { return (new Error(this.message)).stack }

			get toString() { 
				pathInfo = this.path ? (', \'' + this.path + '\'') : '';
				return `${this.name}: ${this.message}${pathInfo}`; 
			}
		};
	}

	let Crypto;
	if(Platform.supportsWebCrypto()) {
		Crypto = class Crypto
		{
			static randomBytes(arrayBuffer)
			{
				return window.crypto.getRandomValues(arrayBuffer);
			}
		};
	} else if(Platform.supportsNodeCrypto()) {
		let nodeCrypto = require("crypto");
		Crypto = class Crypto
		{
			static randomBytes(arrayBuffer)
			{
				return nodeCrypto.randomFillSync(arrayBuffer);
			}
		};
	} else {
		throw new errors.ENOTSUPPORTED("crypto support is not available on this platform");
	}

	var Crypto$1 = Crypto;

	const BASE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('');
	const BASE_MAP = {};

	for (var z = 0; z < BASE.length; z += 1) {
	    var x = BASE[z];

	    if (BASE_MAP[x] !== undefined) throw new TypeError(`${x} is ambiguous`)
	      BASE_MAP[x] = z;
	}

	function encode(source) {
	    if (source.length === 0) return ''

	    var digits = [0];
	    for (var i = 0; i < source.length; ++i) {
	      for (var j = 0, carry = source[i]; j < digits.length; ++j) {
	        carry += digits[j] << 8;
	        digits[j] = carry % BASE.length;
	        carry = (carry / BASE.length) | 0;
	      }

	      while (carry > 0) {
	        digits.push(carry % BASE.length);
	        carry = (carry / BASE.length) | 0;
	      }
	    }

	    var string = "";

	    for (var k = 0; source[k] === 0 && k < source.length - 1; ++k) 
	      string += BASE[0];

	    for (var q = digits.length - 1; q >= 0; --q) 
	      string += BASE[digits[q]];

	    return string
	}

	class UUID {
	  static v4()
	  {
	    let buffer = new Uint8Array(16);
	    Crypto$1.randomBytes(buffer);

	    buffer[6] &= 0b00001111;
	    buffer[6] |= 0b01000000;

	    buffer[8] &= 0b00111111;
	    buffer[8] |= 0b10000000;

	    return encode(buffer);
	  }

	  static short()
	  {
	    return this.v4();
	  }
	}

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

	class Buffer extends Uint8Array
	{
		constructor(arg, encodingOrOffset, length)
		{
			if (typeof arg === "number") {
			    if (typeof encodingOrOffset === "string") {
			      throw new TypeError(`The "string" argument must be of type string. Received type number`);
			    }
			    return allocUnsafe(arg);
			  }
			return from(arg, encodingOrOffset, length);
		}

		static get INSPECT_MAX_BYTES() { return 50 }

		static get K_MAX_LENGTH() { return 0x7fffffff }

		static isSupported()
		{
			try {
			    var arr = new Uint8Array(1);
			    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }};
			    return arr.foo() === 42
			  } catch (e) {
			    return false
			}
		}

		static from(value, encodingOrOffset, length)
		{
		  if (typeof value === 'string') {
		    return fromString(value, encodingOrOffset)
		  }

		  if (ArrayBuffer.isView(value)) {
		    return fromArrayLike(value)
		  }

		  if (value == null) {
		    throw TypeError(`The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ${typeof value}`);
		  }

		  if (isInstance(value, ArrayBuffer) ||
		      (value && isInstance(value.buffer, ArrayBuffer))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof value === 'number') {
		    throw new TypeError(
		      'The "value" argument must not be of type number. Received type number'
		    )
		  }

		  var valueOf = value.valueOf && value.valueOf();
		  if(valueOf != null && valueOf !== value) {
		    return Buffer.from(valueOf, encodingOrOffset, length);
		  }

		  var b = fromObject(value);
		  if(b) {
		  	return b;
		  }

		  if(typeof Symbol !== "undefined" && Symbol.toPrimitive != null &&
		      typeof value[Symbol.toPrimitive] === "function") {
		    return Buffer.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
		  }

		  throw new TypeError(`The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ${typeof value}`);
		}
	}

	const SUPER_NODE_ID = "0000000000000000000000";

	const MODE_FILE = "FILE";
	const MODE_DIRECTORY = "DIRECTORY";
	const MODE_SYMBOLIC_LINK = "MODE_SYMBOLIC_LINK";
	const MODE_META = "META";

	const ROOT_DIRECTORY_NAME = "/"; // basename(normalize(path))

	const STDIN = 0;
	const STDOUT = 1;
	const STDERR = 2;

	const FIRST_DESCRIPTOR = 3;

	const N_VFS_DESCRIPTORS = 1024;

	const DATA_BLOCK_SEPARATOR = "#";

	const MNT_READ_ONLY = "READ_ONLY";

	const SYMLOOP_MAX = 10;

	const __$1 = new WeakMap();

	class FDMap
	{
		constructor(size=N_VFS_DESCRIPTORS)
		{
			const map = new Array(size).fill(0);

			map[STDIN] = 1;
			map[STDOUT] = 1;
			map[STDERR] = 1;

			__$1.set(this, {
				map: map,
				next: FIRST_DESCRIPTOR,
			});
		}

		claimUnused()
		{		
			const map = __$1.get(this).map;
			let next = __$1.get(this).next;

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
			__$1.get(this).map[fd] = 1;
		}

		release(fd)
		{
			__$1.get(this).map[fd] = 0;
		}
	}

	const __$2 = new WeakMap();

	class VFSMount
	{
		constructor({ parentVFSMount = null, flags = [], fs, rnode = null } = {})
		{
			__$2.set(this, {
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

		get fs() { return __$2.get(this).fs }

		get rnode() { return __$2.get(this).rnode }

		get flags() { return __$2.get(this).flags }

		get parent() { return __$2.get(this).parent }

		get children() { return __$2.get(this).children }

		hasChildren()
		{
			const self = __$2.get(this);

			return this.children.size > 0;
		}

		insertChild(vfsMount)
		{
			const self = __$2.get(this);
			
			self.children.add(vfsMount);
		}

		removeChild(vfsMount)
		{
			const self = __$2.get(this);

			self.children.delete(vfsMount);
		}
	}

	const __$3 = new WeakMap();

	class SuperNodeData
	{
		constructor({ dev, atime = Date.now(), mtime = Date.now(), ctime = Date.now(), rnode, version = UUID.short() } = {})
		{
			__$3.set(this, {
				dev: dev,
				mode: MODE_META,
				atime: atime || Date.now(), // access time (will mirror ctime after creation)
				mtime: mtime || Date.now(), // creation/change time
				ctime: ctime || Date.now(), // modified time
				rnode: rnode, // root node
				version: version,
			});
		}

		get dev() { return __$3.get(this).dev }

		get mode() { return __$3.get(this).mode }

		get atime() { return __$3.get(this).atime }
		set atime(value) { return __$3.get(this).atime = value }

		get mtime() { return __$3.get(this).mtime }
		set mtime(value) { return __$3.get(this).mtime = value }

		get ctime() { return __$3.get(this).ctime }
		set ctime(value) { return __$3.get(this).ctime = value }

		get version() { return __$3.get(this).version }
		set version(value) { return __$3.get(this).version = value }

		get rnode() { return __$3.get(this).rnode }
		set rnode(value) { return __$3.get(this).rnode = value }

		toJSON()
		{
			return {
				dev: this.dev,
				mode: this.mode,
				atime: this.atime,
				mtime: this.mtime,
				ctime: this.ctime,
				rnode: this.rnode,
				version: this.version,
			};
		}
	}

	class SuperNode
	{
		constructor({ fs, data } = {})
		{
			__$3.set(this, {
				fs: fs,
				id: SUPER_NODE_ID,			

				data: new SuperNodeData(data),
			});
		}

		get id() { return __$3.get(this).id }

		get fs() { return __$3.get(this).fs }

		get dev() {	return __$3.get(this).data.dev }

		get mode() { return __$3.get(this).data.mode }

		get atime() { return __$3.get(this).data.atime }
		set atime(value) { return __$3.get(this).data.atime = value }

		get mtime() { return __$3.get(this).data.mtime }
		set mtime(value) { return __$3.get(this).data.mtime = value }

		get ctime() { return __$3.get(this).data.ctime }
		set ctime(value) { return __$3.get(this).data.ctime = value }	

		get rnode() { return __$3.get(this).data.rnode }
		set rnode(value) { return __$3.get(this).data.rnode = value }

		get version() { return __$3.get(this).data.version }
		set version(value) { return __$3.get(this).data.version = value }

		get data() { return __$3.get(this).data.toJSON() }

		static async read(fs)
		{
			let data = await fs.readNode(SUPER_NODE_ID);
			return new SuperNode({ fs: fs, data: data });
		}

		async read()
		{
			let data = await this.fs.readNode(this.id);
			__$3.get(this).data = new SuperNodeData(data);
		}

		async write()
		{
			this.version = UUID.short();
			await fs.writeNode(this.id, this.data);
		}

		toJSON()
		{
			return {
				id: this.id,
				data: __$3.get(this).data.toJSON(),
			}
		}	

		toString()
		{
			return JSON.stringify(this.toJSON());
		}
	}

	const __$4 = new WeakMap();

	class NodeData
	{
		constructor({ mode, size = 0, atime, mtime, ctime, version = UUID.short(), flags, xattrs, nlinks, blksize, nblocks, blkid = UUID.short() })
		{
			__$4.set(this, {
				mode: mode, // node type (file, directory, etc)
				size: size,
				atime: atime || Date.now(), // access time (will mirror ctime after creation)
				mtime: mtime || Date.now(), // creation/change time
				ctime: ctime || Date.now(), // modified time
				version: version || UUID.short(),
				flags: flags || [],
				xattrs: xattrs || {},
				nlinks: nlinks || 0,
				blksize: blksize || 4096,
				nblocks: nblocks || 0,
				blkid: blkid,
			});
		}

		get mode() { return __$4.get(this).mode }

		get atime() { return __$4.get(this).atime }
		set atime(value) { return __$4.get(this).atime = value }

		get mtime() { return __$4.get(this).mtime }
		set mtime(value) { return __$4.get(this).mtime = value }

		get ctime() { return __$4.get(this).ctime }
		set ctime(value) { return __$4.get(this).ctime = value }

		get version() { return __$4.get(this).version }
		set version(value) { return __$4.get(this).version = value }

		get flags() { return __$4.get(this).flags }
		
		get xattrs() { return __$4.get(this).xattrs }

		get nlinks() { return __$4.get(this).nlinks }
		set nlinks(value) { return __$4.get(this).nlinks = value }

		get blksize() { return __$4.get(this).blksize }
		
		get nblocks() { return __$4.get(this).nblocks }
		set nblocks(value) { return __$4.get(this).nblocks = value }

		get blkid() { return __$4.get(this).blkid }
		set blkid(value) { return __$4.get(this).blkid = value }

		get size() { return __$4.get(this).size }
		set size(value) { return __$4.get(this).size = value }	

		toJSON()
		{
			return {
				mode: this.mode,
				size: this.size,
				atime: this.atime,
				mtime: this.mtime,
				ctime: this.ctime,
				nlinks: this.nlinks,
				version: this.version,
				blksize: this.blksize,
				nblocks: this.nblocks,
				blkid: this.blkid,
				flags: this.flags,
				xattrs: this.xattrs,
			};
		}	
	}

	class Node
	{
		constructor({ fs, id = UUID.short(), data } = {})
		{
			__$4.set(this, {
				fs: fs,
				id: id,			

				data: new NodeData(data),
			});
		}

		get fs() { return __$4.get(this).fs }

		get id() { return __$4.get(this).id }
		
		get size() { return __$4.get(this).data.size }
		set size(value) { return __$4.get(this).data.size = value }

		get nlinks() { return __$4.get(this).data.nlinks }
		set nlinks(value) { return __$4.get(this).data.nlinks = value }

		get version() { return __$4.get(this).data.version }
		set version(value) { return __$4.get(this).data.version = value }

		get blksize() { return __$4.get(this).data.blksize }

		get nblocks() {	return __$4.get(this).data.nblocks	}
		set nblocks(value) { return __$4.get(this).data.nblocks = value }

		get atime()	{ return __$4.get(this).data.atime }
		set atime(value) { return __$4.get(this).data.atime = value }

		get mtime() { return __$4.get(this).data.mtime }
		set mtime(value) { return __$4.get(this).data.mtime = value }

		get ctime() { return __$4.get(this).data.ctime }
		set ctime(value) { return __$4.get(this).data.ctime = value }

		get mode() { return __$4.get(this).data.mode }

		get blkid() { return __$4.get(this).data.blkid }
		set blkid(value) { return __$4.get(this).data.blkid = value }

		get flags() { return __$4.get(this).data.flags }

		get xattrs() { return __$4.get(this).data.xattrs }

		get data() { return __$4.get(this).data.toJSON() }

		isFile() 
		{ 
			return MODE_FILE == this.mode;
		}

		isDirectory() 
		{
			return MODE_DIRECTORY == this.mode;
		}

		isSymbolicLink()
		{
			return MODE_SYMBOLIC_LINK == this.mode;
		}

		isSocket()
		{
			return MODE_SOCKET == this.mode;
		}

		isFIFO()
		{
			return MODE_FIFO == this.mode;
		}

		isCharacterDevice()
		{
			return MODE_CHARACTER_DEVICE == this.mode;
		}

		isBlockDevice()
		{
			return MODE_BLOCK_DEVICE == this.mode;
		}

		toString()
		{
			return JSON.stringify(this.toJSON());
		}

		static hash(fs, id)
		{
			return `${fs.id}${id}`;
		}

		hash()
		{
			return Node.hash(this.fs, this.id);
		}

		static async read(fs, id)
		{
			let data = await fs.readNode(id);
			return new Node({ fs: fs, id: id, data: data });
		}

		async read()
		{
			let data = await this.fs.readNode(this.id);
			__$4.get(this).data = new NodeData(data);
		}

		async write()
		{
			this.version = UUID.short();
			return await this.fs.writeNode(this.id, this.data);
		}

		async readData(block=0)
		{
			let data = await this.fs.readData(this.blkid, block);

			return data;
		}

		async writeData(block=0, data)
		{
			this.nblocks = block + 1;
			await this.fs.writeData(this.blkid, block, data);
		}

		async validate()
		{
			
		}

		toJSON()
		{
			return {
				fs: this.fs.id,
				id: this.id,
				data: __$4.get(this).data.toJSON(),
			}
		}	

		toString()
		{
			return JSON.stringify(this.toJSON());
		}
	}

	const __$5 = new WeakMap();

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

			__$5.set(this, {
				storage: storage,
			});
		}

		static get type()
		{
			return "rootfs";
		}

		static async mount()
		{
			throw new errors.UNKNOWN("mount operation not available for rootfs");
		}

		async umount()
		{
			throw new errors.UNKNOWN("umount operation not available for rootfs");
		}	

		async readNode(id)
		{
			let node = __$5.get(this).storage.get(id);		

			if(!node) {
				throw new errors.ENOENT();
			}

			return node;
		}

		async writeNode(id, node)
		{
			throw new errors.EROFS();
		}

		async readData(id, block=0)
		{
			let data = __$5.get(this).storage.get(`${id}${DATA_BLOCK_SEPARATOR}${block}`);

			if(!data) {
				throw new errors.EIO();
			}

			return data;
		}

		async writeData(id, block, data)
		{
			throw new errors.EROFS();
		}

		async fsync()
		{

		}

		async validate(id)
		{

		}
	}

	function normalizeArray(parts, allowAboveRoot) {
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = parts.length - 1; i >= 0; i--) {
	    var last = parts[i];
	    if (last === '.') {
	      parts.splice(i, 1);
	    } else if (last === '..') {
	      parts.splice(i, 1);
	      up++;
	    } else if (up) {
	      parts.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (allowAboveRoot) {
	    for (; up--; up) {
	      parts.unshift('..');
	    }
	  }

	  return parts;
	}

	// Split a filename into [root, dir, basename, ext], unix version
	// 'root' is just a slash, or nothing.
	var splitPathRe =
	      /^(\/?)([\s\S]+\/(?!$)|\/)?((?:\.{1,2}$|[\s\S]+?)?(\.[^.\/]*)?)$/;
	var splitPath = function(filename) {
	  var result = splitPathRe.exec(filename);
	  return [result[1] || '', result[2] || '', result[3] || '', result[4] || ''];
	};

	// path.normalize(path)
	function normalize(path) {
	  var isAbsolute = path.charAt(0) === '/',
	      trailingSlash = path.substr(-1) === '/';

	  // Normalize the path
	  path = normalizeArray(path.split('/').filter(function(p) {
	    return !!p;
	  }), !isAbsolute).join('/');

	  if (!path && !isAbsolute) {
	    path = '.';
	  }
	  /*
	   if (path && trailingSlash) {
	   path += '/';
	   }
	   */

	  return (isAbsolute ? '/' : '') + path;
	}

	function dirname(path) {
	  var result = splitPath(path),
	      root = result[0],
	      dir = result[1];

	  if (!root && !dir) {
	    // No dirname whatsoever
	    return '.';
	  }

	  if (dir) {
	    // It has a dirname, strip trailing slash
	    dir = dir.substr(0, dir.length - 1);
	  }

	  return root + dir;
	}

	function basename(path, ext) {
	  var f = splitPath(path)[2];
	  // TODO: make this comparison case-insensitive on windows?
	  if (ext && f.substr(-1 * ext.length) === ext) {
	    f = f.substr(0, f.length - ext.length);
	  }
	  // XXXfiler: node.js just does `return f`
	  return f === "" ? "/" : f;
	}

	function isAbsolute(path) {
	  if(path.charAt(0) === '/') {
	    return true;
	  }
	  return false;
	}

	function isNull(path) {
	  if (('' + path).indexOf('\u0000') !== -1) {
	    return true;
	  }
	  return false;
	}

	function check(path) {
	  if(!path) {
	    throw new errors.EINVAL('path must be a string', path);
	  } else if(isNull(path)) {
	    throw new errors.EINVAL('path must be a string without null bytes', path);
	  } else if(!isAbsolute(path)) {
	    throw new errors.EINVAL('path must be absolute', path);
	  }
	}

	const __$6 = new WeakMap();

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

			__$6.set(this, {
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
			let node = __$6.get(this).storage.get(id);

			if(!node) {
				throw new errors.ENOENT();
			}

			return node;
		}

		async writeNode(id, node)
		{
			__$6.get(this).storage.set(id, node);
		}

		async readData(id, block=0)
		{
			let data = __$6.get(this).storage.get(`${id}${DATA_BLOCK_SEPARATOR}${block}`);

			if(!data) {
				throw new errors.EIO();
			}

			return data;
		}

		async writeData(id, block, data)
		{
			__$6.get(this).storage.set(`${id}${DATA_BLOCK_SEPARATOR}${block}`, data);
		}

		async fsync()
		{

		}

		async validate(id)
		{

		}
	}

	var Providers = {
		[RootFS.type]: RootFS,
		[MemFS.type]: MemFS,
	};

	const __$7 = new WeakMap();

	class DirectoryEntry
	{
		constructor({ id, type=MODE_FILE } = {})
		{
			__$7.set(this, {
				id: id,
				type: type,
			});
		}

		get id() { return __$7.get(this).id }

		get type() { return __$7.get(this).type }
	}

	const __$8 = new WeakMap();

	const URL_REGEX = /^((\w+)\+(\w+):)?(\/\/((\w+)?(:(\w+))?@)?([^\/\?:]+)(:(\d+))?)?(\/?([^\/\?#][^\?#]*)?)?(\?([^#]+))?(#(\w*))?/i;

	class URL
	{
		constructor(urlString)
		{
			__$8.set(this, {

			});
			const self = __$8.get(this);

		    let match = urlString.match(URL_REGEX);
		 
		 	self.originalURL = match[0];

		 	if(match[2]) {
		 		self.protocol = match[2];
		 	}

		    if(match[3]) {
		        self.subprotocol = match[3];
		    }
		 
		    if(match[6]) {
		        self.username = match[6];
		    }
		 
		    if(match[8]) {
		        self.password = match[8];
		    }
		 
		    if(match[9]) {
		        self.host = match[9];
		    } else {
		    	self.host = "";
		    }
		 
		    if(match[11]) {
		        self.port = match[11];
		    }

		    if(match[12]) {
		    	self.path = match[12];
		    } else {
		    	self.path = "";
		    }

		    if(match[15]) {
		    	let queryList = match[15].split("&");
		    	let query = {};
		    	for(let item of queryList) {
		    		let [key, value] = item.split("=");
		    		if(!(query.hasOwnProperty(key))) {
		    			query[key] = [];
		    		}
		    		if(value) {
		    			query[key].push(value);
		    		}
		    	}
		    	self.query = query;
		    } else {
		    	self.query = {};
		    }

		    if(match[17]) {
		    	self.fragment = match[17];
		    } else {
		    	self.fragment = "";
		    }
		}

		get protocol() { return __$8.get(this).protocol }
		set protocol(value) { return __$8.get(this).protocol = value }

		get subprotocol() { return __$8.get(this).subprotocol }
		set subprotocol(value) { return __$8.get(this).subprotocol = value }

		get username() { return __$8.get(this).username }
		set username(value) { return __$8.get(this).username = value }

		get password() { return __$8.get(this).password }
		set password(value) { return __$8.get(this).password = value }

		get host() { return __$8.get(this).host }
		set host(value) { return __$8.get(this).host = value }

		get port() { return __$8.get(this).port }
		set port(value) { return __$8.get(this).port = value }

		get path() { return __$8.get(this).path }
		set path(value) { return __$8.get(this).path = value }

		get query() { return __$8.get(this).query }
		set query(value) { return __$8.get(this).query = value }

		get fragment() { return __$8.get(this).fragment }
		set fragment(value) { return __$8.get(this).fragment = value }

		toJSON()
		{
			return {
				protocol: this.protocol,
				subprotocol: this.subprotocol,
				username: this.username,
				password: this.password,
				host: this.host,
				port: this.port,			
				path: this.path,
				query: this.query,
				fragment: this.fragment,
			};
		}
	}

	const __$9 = new WeakMap();

	class InternalVFS
	{
		constructor()
		{
			const rootFS = new RootFS();
			const rootFSVFSMount = new VFSMount({ fs: rootFS, flags: [ MNT_READ_ONLY ] });		
			const fsVFSMounts = new WeakMap();
			fsVFSMounts.set(rootFS, rootFSVFSMount);

			__$9.set(this, {
				fdMap: new FDMap(),

				vfsMountsRoot: rootFSVFSMount,
				fsVFSMounts: fsVFSMounts,
				vfsMounts: new Map(),
			});
		}

		async findNode({path, followSymlinks = true} = {}, context)
		{
			const self = __$9.get(this);

			if(!context) {
				context = { symlinksFollowed: 0 };
			}

			path = normalize(path);
			if(!path) {
		    	throw new errors.ENOENT("path is an empty string");
		  	}

			let name = basename(path);
			let parentPath = dirname(path);

			let fs;
			let nodeId;
			if(ROOT_DIRECTORY_NAME == name) {
				fs = self.vfsMountsRoot.fs;
				let superNode = await SuperNode.read(fs);
				nodeId = superNode.rnode;
			} else {
				let parentDirectoryNode = await this.findNode({ path: parentPath }, context);
				fs = parentDirectoryNode.fs;

				if(parentDirectoryNode.mode !== MODE_DIRECTORY) {
					throw new errors.ENOTDIR("a component of the path prefix is not a directory", path);
				}

				let parentDirectoryData;
				try {
					parentDirectoryData = await parentDirectoryNode.readData();
				} catch(error) {
					parentDirectoryData = new Object();
				}

				if(!parentDirectoryData.hasOwnProperty(name)) {
					throw new errors.ENOENT(null, path);
				}

				let directoryEntry = new DirectoryEntry(parentDirectoryData[name]);
				nodeId = directoryEntry.id;
			}

			// Follow all vfsMounts on this node.
			let nodeHash = Node.hash(fs, nodeId);
			while(self.vfsMounts.has(nodeHash)) {
				let vfsMount = (self.vfsMounts.get(nodeHash))[0];
				fs = vfsMount.fs;

				if(vfsMount.rnode) {
					nodeId = vfsMount.rnode;
				} else {
					let superNode = await SuperNode.read(fs);
					nodeId = superNode.rnode;
				}

				nodeHash = Node.hash(fs, nodeId);
			}		

			let node = await Node.read(fs, nodeId);

			if(node.mode == MODE_SYMBOLIC_LINK) {
				context.symlinksFollowed += 1;

				if(context.symlinksFollowed > SYMLOOP_MAX) {
					throw new errors.ELOOP(null, path);
				}

				let symlinkPath = await node.readData();
				node = await this.findNode({ path: symlinkPath }, context);
			}

			return node;
		}

		async mount(fsURL, mountPath, flags, options)
		{
			const self = __$9.get(this);

			let mountPoint = await this.findNode({ path: mountPath });

			if(!mountPoint) {
				throw new errors.ENOENT("mount target does not exist");
			}

			let url = new URL(fsURL);

			if("filer" !== url.protocol) {
				throw new errors.UNKNOWN("expecting filer protocol");
			}

			let dev = url.path.slice(1);
			let type = url.subprotocol;
			
			if(!(type in Providers)) {
				throw new errors.UNKNOWN("unknown file system type");
			}

			let fs = await Providers[type].mount(dev, flags, options);
			let superNode = await fs.readNode(SUPER_NODE_ID);
			let rootNode = await fs.readNode(superNode.rnode);

			let vfsMount = new VFSMount({ parent: self.fsVFSMounts.get(mountPoint.fs), flags: flags, fs: fs });
			self.fsVFSMounts.set(fs, vfsMount);

			if(!self.vfsMounts.has(mountPoint.hash())) {
				self.vfsMounts.set(mountPoint.hash(), new Array());
			}
			self.vfsMounts.get(mountPoint.hash()).unshift(vfsMount);
		}

		async umount(path)
		{
			const self = __$9.get(this);

			let mountPoint = await this.findNode({ path: path });
	console.log(self.vfsMounts.keys(), mountPoint.hash());
			if(!self.vfsMounts.has(mountPoint.hash())) {
				throw new errors.EINVAL(null, path);
			}

			let vfsMount = self.vfsMounts.get(mountPoint.hash());
			if(vfsMount.hasChildren()) {
				throw new errors.EBUSY(null, path);
			}
		}

		open(path, flags, mode, callback)
		{

		}

		close(fd, callback)
		{

		}

		mknod(path, mode, callback)
		{

		}

		async mkdir(path, mode)
		{
			path = normalize(path);

			let name = basename(path);
			let parentPath = dirname(path);

			let directoryNode;
			try {
				directoryNode = await this.findNode({ path: path });
			} catch(error) {
				directoryNode = null;
			}

			if(directoryNode) {
				console.log(directoryNode.toJSON());
				throw new errors.EEXIST(null, path);
			}

			let parentDirectoryNode = await this.findNode({ path: parentPath });
			let fs = parentDirectoryNode.fs;

			let parentDirectoryData;
			try {
				parentDirectoryData = await parentDirectoryNode.readData();
			} catch(error) {
				parentDirectoryData = new Object();
			}

			directoryNode = new Node({ fs: fs, data: { mode: MODE_DIRECTORY, nlinks: 1, data: UUID.short() } });		
			directoryNode.write();

			let directoryData = new Object();
			await directoryNode.writeData(0, directoryData);

			// ! update node a/c/m times

			parentDirectoryData[name] = new DirectoryEntry({ id: directoryNode.id, type: MODE_DIRECTORY });		
			await parentDirectoryNode.writeData(0, parentDirectoryData);

			parentDirectoryNode.size = Object.keys(parentDirectoryData).length;
			await parentDirectoryNode.write();
		}

		async readdir(path)
		{
			check(path);

			let directoryNode = await this.findNode({ path: path });
			let directoryData;
			try {
				directoryData = await directoryNode.readData();
			} catch(error) {
				if(error instanceof errors.EIO)
					directoryData = new Object();
			}

			let files = Object.keys(directoryData);
			return files;
		}

		rmdir(path, callback)
		{

		}

		stat(path, callback)
		{

		}

		fstat(fd, callback)
		{

		}

		link(oldpath, newpath, callback)
		{

		}

		unlink(path, callback)
		{

		}

		read(fd, buffer, offset, length, position, callback)
		{

		}

		readFile(path, options, callback)
		{

		}

		write(fd, buffer, offset, length, position, callback)
		{

		}

		writeFile(path, data, options, callback)
		{

		}

		appendFile(path, data, options, callback)
		{

		}

		exists(path, callback)
		{

		}

		getxattr(path, name, callback)
		{

		}

		fgetxattr(fd, name, callback)
		{

		}

		setxattr(path, name, value, flag, callback)
		{

		}

		fsetxattr(fd, name, value, flag, callback)
		{

		}

		removexattr(path, name, callback)
		{

		}

		fremovexattr(fd, name, callback)
		{

		}

		lseek(fd, offset, whence, callback)
		{

		}	

		utimes(path, atime, mtime, callback)
		{

		}

		futimes(fd, atime, mtime, callback)
		{

		}

		rename(oldpath, newpath, callback)
		{

		}

		symlink(srcpath, dstpath, type, callback)
		{

		}

		readlink(path, callback)
		{

		}

		lstat(path, callback)
		{

		}

		truncate(path, length, callback)
		{

		}

		ftruncate(fd, length, callback)
		{

		}
	}
	class VFS
	{
		constructor()
		{
			__$9.set(this, {
				vfs: new InternalVFS(),
			});
		}

		async mount(...args) { return await __$9.get(this).vfs.mount(...args); }

		async umount(...args) { return await __$9.get(this).vfs.umount(...args); }

		async mkdir(...args) { return await __$9.get(this).vfs.mkdir(...args); }

		async readdir(...args) { return await __$9.get(this).vfs.readdir(...args); }
	}

	var index = { 
		FS: FS,
		VFS: VFS,
		UUID: UUID,
		Buffer: Buffer,
		Crypto: Crypto$1,
	};

	return index;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXIuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21tb24vcGxhdGZvcm0uanMiLCIuLi9zcmMvY29tbW9uL2Vycm9ycy5qcyIsIi4uL3NyYy9jb21tb24vY3J5cHRvLmpzIiwiLi4vc3JjL2NvbW1vbi91dWlkLmpzIiwiLi4vc3JjL2ZzL2ZzLmpzIiwiLi4vc3JjL2NvbW1vbi9idWZmZXIuanMiLCIuLi9zcmMvY29tbW9uL2NvbnN0YW50cy5qcyIsIi4uL3NyYy92ZnMvZmRtYXAuanMiLCIuLi9zcmMvdmZzL3Zmc21vdW50LmpzIiwiLi4vc3JjL2ZzL3N1cGVyLW5vZGUuanMiLCIuLi9zcmMvZnMvbm9kZS5qcyIsIi4uL3NyYy9mcy9wcm92aWRlcnMvcm9vdC1mcy5qcyIsIi4uL3NyYy9jb21tb24vcGF0aC5qcyIsIi4uL3NyYy9mcy9wcm92aWRlcnMvbWVtLWZzLmpzIiwiLi4vc3JjL2ZzL3Byb3ZpZGVycy9pbmRleC5qcyIsIi4uL3NyYy92ZnMvZGlyZWN0b3J5LWVudHJ5LmpzIiwiLi4vc3JjL2NvbW1vbi91cmwuanMiLCIuLi9zcmMvdmZzL3Zmcy5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBQbGF0Zm9ybVxue1xuXHRzdGF0aWMgc3VwcG9ydHNXZWJDcnlwdG8oKVxuXHR7XG5cdFx0cmV0dXJuIChcInVuZGVmaW5lZFwiICE9PSB0eXBlb2Ygd2luZG93ICYmIFxuXHRcdFx0XHRcInVuZGVmaW5lZFwiICE9PSB0eXBlb2Ygd2luZG93LmNyeXB0byAmJlxuXHRcdFx0XHRcImZ1bmN0aW9uXCIgPT09IHR5cGVvZiB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyk7XG5cdH1cblxuXHRzdGF0aWMgc3VwcG9ydHNOb2RlQ3J5cHRvKClcblx0e1xuXHRcdGlmKFwidW5kZWZpbmVkXCIgIT09IHR5cGVvZiBwcm9jZXNzKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXF1aXJlLnJlc29sdmUoXCJjcnlwdG9cIik7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fSBjYXRjaChlKSB7XHRcdFx0XHRcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGxhdGZvcm07IiwiY2xhc3MgRmlsZXJFcnJvciBleHRlbmRzIEVycm9yXG57XG5cdGNvbnN0cnVjdG9yKG1lc3NhZ2UsIHBhdGggPSBudWxsKVxuXHR7XG5cdFx0c3VwZXIobWVzc2FnZSk7XG5cblx0XHR0aGlzLnBhdGggPSBwYXRoO1xuXHR9XG59XG5cbmNvbnN0IGVycm9ycyA9IHt9O1xuY29uc3QgZXJyb3JEZWZpbml0aW9ucyA9IFxuW1xuXHR7IGVycm5vOiAtMSwgbmFtZTogXCJVTktOT1dOXCIsIHRleHQ6IFwidW5rbm93biBlcnJvclwiIH0sXG5cdHsgZXJybm86IDAsIG5hbWU6IFwiT0tcIiwgdGV4dDogXCJzdWNjZXNzXCIgfSxcblx0eyBlcnJubzogMSwgbmFtZTogXCJFT0ZcIiwgdGV4dDogXCJlbmQgb2YgZmlsZVwiIH0sXG5cblx0eyBlcnJubzogOSwgbmFtZTogXCJFQkFERlwiLCB0ZXh0OiBcImJhZCBmaWxlIGRlc2NyaXB0b3JcIiB9LFxuXHR7IGVycm5vOiAxMCwgbmFtZTogXCJFQlVTWVwiLCB0ZXh0OiBcInJlc291cmNlIGJ1c3kgb3IgbG9ja2VkXCIgfSxcblxuXHR7IGVycm5vOiAxOCwgbmFtZTogXCJFSU5WQUxcIiwgdGV4dDogXCJpbnZhbGlkIGFyZ3VtZW50XCIgfSxcblxuXHR7IGVycm5vOiAyNywgbmFtZTogXCJFTk9URElSXCIsIHRleHQ6IFwibm90IGEgZGlyZWN0b3J5XCIgfSxcblx0eyBlcnJubzogMjgsIG5hbWU6IFwiRUlTRElSXCIsIHRleHQ6IFwiaWxsZWdhbCBvcGVyYXRpb24gb24gZGlyZWN0b3J5XCIgfSxcblxuXHR7IGVycm5vOiAzNCwgbmFtZTogXCJFTk9FTlRcIiwgdGV4dDogXCJubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5XCIgfSxcblxuXHR7IGVycm5vOiA0NywgbmFtZTogXCJFRVhJU1RcIiwgdGV4dDogXCJmaWxlIGFscmVhZHkgZXhpc3RzXCIgfSxcblxuXHR7IGVycm5vOiA1MCwgbmFtZTogXCJFUEVSTVwiLCB0ZXh0OiBcIm9wZXJhdGlvbiBub3QgcGVybWl0dGVkXCIgfSxcblx0eyBlcnJubzogNTEsIG5hbWU6IFwiRUxPT1BcIiwgdGV4dDogXCJ0b28gbWFueSBzeW1ib2xpYyBsaW5rcyBlbmNvdW50ZXJlZFwiIH0sXG5cblx0eyBlcnJubzogNTMsIG5hbWU6IFwiRU5PVEVNUFRZXCIsIHRleHQ6IFwiZGlyZWN0b3J5IG5vdCBlbXB0eVwiIH0sXG5cblx0eyBlcnJubzogNTUsIG5hbWU6IFwiRUlPXCIsIHRleHQ6IFwiaS9vIGVycm9yXCIgfSxcblx0eyBlcnJubzogNTYsIG5hbWU6IFwiRVJPRlNcIiwgdGV4dDogXCJyZWFkLW9ubHkgZmlsZSBzeXN0ZW1cIiB9LFxuXHR7IGVycm5vOiA1NywgbmFtZTogXCJFTk9ERVZcIiwgdGV4dDogXCJubyBzdWNoIGRldmljZVwiIH0sXG5cblx0eyBlcnJubzogNTgsIG5hbWU6IFwiRUNBTkNFTEVEXCIsIHRleHQ6IFwib3BlcmF0aW9uIGNhbmNlbGVkXCIgfSxcblxuXHR7IGVycm5vOiAxMDAwLCBuYW1lOiBcIkVOT1RTVVBQT1JURURcIiwgdGV4dDogXCJwbGF0Zm9ybSBpcyBub3Qgc3VwcG9ydGVkXCIgfSxcbl1cblxuZm9yIChsZXQgZXJyb3Igb2YgZXJyb3JEZWZpbml0aW9ucykge1xuXHRlcnJvcnNbZXJyb3IuZXJybm9dID0gZXJyb3JzW2Vycm9yLm5hbWVdID0gY2xhc3MgZXh0ZW5kcyBGaWxlckVycm9yIHtcblx0XHRjb25zdHJ1Y3RvcihtZXNzYWdlLCBwYXRoKVxuXHRcdHtcblx0XHRcdHN1cGVyKG1lc3NhZ2UgfHwgZXJyb3IudGV4dCwgcGF0aCk7XG5cdFx0fVxuXG5cdFx0Z2V0IG5hbWUoKSB7IHJldHVybiBlcnJvci5uYW1lIH1cblxuXHRcdGdldCBjb2RlKCkgeyByZXR1cm4gZXJyb3IubmFtZSB9XG5cblx0XHRnZXQgZXJybm8oKSB7IHJldHVybiBlcnJvci5lcnJubyB9XG5cblx0XHRnZXQgbWVzc2FnZSgpIHsgcmV0dXJuIHRoaXMubWVzc2FnZSB9XHRcdFxuXG5cdFx0Z2V0IHN0YWNrKCkgeyByZXR1cm4gKG5ldyBFcnJvcih0aGlzLm1lc3NhZ2UpKS5zdGFjayB9XG5cblx0XHRnZXQgdG9TdHJpbmcoKSB7IFxuXHRcdFx0cGF0aEluZm8gPSB0aGlzLnBhdGggPyAoJywgXFwnJyArIHRoaXMucGF0aCArICdcXCcnKSA6ICcnO1xuXHRcdFx0cmV0dXJuIGAke3RoaXMubmFtZX06ICR7dGhpcy5tZXNzYWdlfSR7cGF0aEluZm99YDsgXG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGVycm9yczsiLCJpbXBvcnQgUGxhdGZvcm0gZnJvbSBcIi4vcGxhdGZvcm1cIjtcbmltcG9ydCBFIGZyb20gXCIuL2Vycm9yc1wiO1xuXG5sZXQgQ3J5cHRvO1xuaWYoUGxhdGZvcm0uc3VwcG9ydHNXZWJDcnlwdG8oKSkge1xuXHRDcnlwdG8gPSBjbGFzcyBDcnlwdG9cblx0e1xuXHRcdHN0YXRpYyByYW5kb21CeXRlcyhhcnJheUJ1ZmZlcilcblx0XHR7XG5cdFx0XHRyZXR1cm4gd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYXJyYXlCdWZmZXIpO1xuXHRcdH1cblx0fVxufSBlbHNlIGlmKFBsYXRmb3JtLnN1cHBvcnRzTm9kZUNyeXB0bygpKSB7XG5cdGxldCBub2RlQ3J5cHRvID0gcmVxdWlyZShcImNyeXB0b1wiKTtcblx0Q3J5cHRvID0gY2xhc3MgQ3J5cHRvXG5cdHtcblx0XHRzdGF0aWMgcmFuZG9tQnl0ZXMoYXJyYXlCdWZmZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5vZGVDcnlwdG8ucmFuZG9tRmlsbFN5bmMoYXJyYXlCdWZmZXIpO1xuXHRcdH1cblx0fVxufSBlbHNlIHtcblx0dGhyb3cgbmV3IEUuRU5PVFNVUFBPUlRFRChcImNyeXB0byBzdXBwb3J0IGlzIG5vdCBhdmFpbGFibGUgb24gdGhpcyBwbGF0Zm9ybVwiKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgQ3J5cHRvOyIsImltcG9ydCBDcnlwdG8gZnJvbSBcIi4vY3J5cHRvXCI7XG5cbmNvbnN0IFVVSURfU0hPUlRfUkVHRVggPSAvXlswLTlhLXpBLVpdezIyfSQvO1xuY29uc3QgQkFTRSA9IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjAxMjM0NTY3ODlcIi5zcGxpdCgnJyk7XG5jb25zdCBCQVNFX01BUCA9IHt9O1xuXG5mb3IgKHZhciB6ID0gMDsgeiA8IEJBU0UubGVuZ3RoOyB6ICs9IDEpIHtcbiAgICB2YXIgeCA9IEJBU0Vbel07XG5cbiAgICBpZiAoQkFTRV9NQVBbeF0gIT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHt4fSBpcyBhbWJpZ3VvdXNgKVxuICAgICAgQkFTRV9NQVBbeF0gPSB6O1xufVxuXG5mdW5jdGlvbiBlbmNvZGUoc291cmNlKSB7XG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG4gICAgdmFyIGRpZ2l0cyA9IFswXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlLmxlbmd0aDsgKytpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMCwgY2FycnkgPSBzb3VyY2VbaV07IGogPCBkaWdpdHMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgY2FycnkgKz0gZGlnaXRzW2pdIDw8IDhcbiAgICAgICAgZGlnaXRzW2pdID0gY2FycnkgJSBCQVNFLmxlbmd0aFxuICAgICAgICBjYXJyeSA9IChjYXJyeSAvIEJBU0UubGVuZ3RoKSB8IDBcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGNhcnJ5ID4gMCkge1xuICAgICAgICBkaWdpdHMucHVzaChjYXJyeSAlIEJBU0UubGVuZ3RoKVxuICAgICAgICBjYXJyeSA9IChjYXJyeSAvIEJBU0UubGVuZ3RoKSB8IDBcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3RyaW5nID0gXCJcIjtcblxuICAgIGZvciAodmFyIGsgPSAwOyBzb3VyY2Vba10gPT09IDAgJiYgayA8IHNvdXJjZS5sZW5ndGggLSAxOyArK2spIFxuICAgICAgc3RyaW5nICs9IEJBU0VbMF07XG5cbiAgICBmb3IgKHZhciBxID0gZGlnaXRzLmxlbmd0aCAtIDE7IHEgPj0gMDsgLS1xKSBcbiAgICAgIHN0cmluZyArPSBCQVNFW2RpZ2l0c1txXV07XG5cbiAgICByZXR1cm4gc3RyaW5nXG59XG5cbmNsYXNzIFVVSUQge1xuICBzdGF0aWMgdjQoKVxuICB7XG4gICAgbGV0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDE2KTtcbiAgICBDcnlwdG8ucmFuZG9tQnl0ZXMoYnVmZmVyKTtcblxuICAgIGJ1ZmZlcls2XSAmPSAwYjAwMDAxMTExO1xuICAgIGJ1ZmZlcls2XSB8PSAwYjAxMDAwMDAwO1xuXG4gICAgYnVmZmVyWzhdICY9IDBiMDAxMTExMTE7XG4gICAgYnVmZmVyWzhdIHw9IDBiMTAwMDAwMDA7XG5cbiAgICByZXR1cm4gZW5jb2RlKGJ1ZmZlcik7XG4gIH1cblxuICBzdGF0aWMgc2hvcnQoKVxuICB7XG4gICAgcmV0dXJuIHRoaXMudjQoKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBVVUlEOyIsImltcG9ydCBVVUlEIGZyb20gXCIuLi9jb21tb24vdXVpZFwiO1xuXG5jb25zdCBfXyA9IG5ldyBXZWFrTWFwKCk7XG5cbmNsYXNzIEZTXG57XG5cdGNvbnN0cnVjdG9yKHN1cGVyTm9kZSwgb3B0aW9ucylcblx0e1xuXHRcdGxldCB7IHByb3h5LCByZXZva2UgfSA9IFByb3h5LnJldm9jYWJsZSh0aGlzLCB7fSk7XG5cblx0XHRfXy5zZXQocHJveHksIHtcblx0XHRcdGlkOiBVVUlELnNob3J0KCksXHQvLyBpbnN0YW5jZSBJRFxuXHRcdFx0cmV2b2tlOiByZXZva2UsXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcHJveHk7XG5cdH1cdFxuXG5cdGdldCBpZCgpXG5cdHtcblx0XHRyZXR1cm4gX18uZ2V0KHRoaXMpLmlkO1xuXHR9XG5cblx0c3RhdGljIGFzeW5jIG1vdW50KGRldiwgZmxhZ3M9W10sIG9wdGlvbnM9e30pXG5cdHtcblxuXHR9XG5cblx0YXN5bmMgdW1vdW50KClcblx0e1xuXHRcdF9fLmdldCh0aGlzKS5yZXZva2UoKTtcblx0fVxuXG5cdHRvU3RyaW5nKClcblx0e1xuXHRcdHJldHVybiB0aGlzLmlkO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZTOyIsImNvbnN0IElOU1BFQ1RfTUFYX0JZVEVTID0gNTA7XG5jb25zdCBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmO1xuXG5jbGFzcyBCdWZmZXIgZXh0ZW5kcyBVaW50OEFycmF5XG57XG5cdGNvbnN0cnVjdG9yKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuXHR7XG5cdFx0aWYgKHR5cGVvZiBhcmcgPT09IFwibnVtYmVyXCIpIHtcblx0XHQgICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSBcInN0cmluZ1wiKSB7XG5cdFx0ICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIFwic3RyaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4gUmVjZWl2ZWQgdHlwZSBudW1iZXJgKTtcblx0XHQgICAgfVxuXHRcdCAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKTtcblx0XHQgIH1cblx0XHRyZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCk7XG5cdH1cblxuXHRzdGF0aWMgZ2V0IElOU1BFQ1RfTUFYX0JZVEVTKCkgeyByZXR1cm4gNTAgfVxuXG5cdHN0YXRpYyBnZXQgS19NQVhfTEVOR1RIKCkgeyByZXR1cm4gMHg3ZmZmZmZmZiB9XG5cblx0c3RhdGljIGlzU3VwcG9ydGVkKClcblx0e1xuXHRcdHRyeSB7XG5cdFx0ICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuXHRcdCAgICBhcnIuX19wcm90b19fID0ge19fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfX1cblx0XHQgICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcblx0XHQgIH0gY2F0Y2ggKGUpIHtcblx0XHQgICAgcmV0dXJuIGZhbHNlXG5cdFx0fVxuXHR9XG5cblx0c3RhdGljIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcblx0e1xuXHQgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG5cdCAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcblx0ICB9XG5cblx0ICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKSkge1xuXHQgICAgcmV0dXJuIGZyb21BcnJheUxpa2UodmFsdWUpXG5cdCAgfVxuXG5cdCAgaWYgKHZhbHVlID09IG51bGwpIHtcblx0ICAgIHRocm93IFR5cGVFcnJvcihgVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJHt0eXBlb2YgdmFsdWV9YCk7XG5cdCAgfVxuXG5cdCAgaWYgKGlzSW5zdGFuY2UodmFsdWUsIEFycmF5QnVmZmVyKSB8fFxuXHQgICAgICAodmFsdWUgJiYgaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsIEFycmF5QnVmZmVyKSkpIHtcblx0ICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcblx0ICB9XG5cblx0ICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuXHQgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcblx0ICAgICAgJ1RoZSBcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuXHQgICAgKVxuXHQgIH1cblxuXHQgIHZhciB2YWx1ZU9mID0gdmFsdWUudmFsdWVPZiAmJiB2YWx1ZS52YWx1ZU9mKCk7XG5cdCAgaWYodmFsdWVPZiAhPSBudWxsICYmIHZhbHVlT2YgIT09IHZhbHVlKSB7XG5cdCAgICByZXR1cm4gQnVmZmVyLmZyb20odmFsdWVPZiwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKTtcblx0ICB9XG5cblx0ICB2YXIgYiA9IGZyb21PYmplY3QodmFsdWUpO1xuXHQgIGlmKGIpIHtcblx0ICBcdHJldHVybiBiO1xuXHQgIH1cblxuXHQgIGlmKHR5cGVvZiBTeW1ib2wgIT09IFwidW5kZWZpbmVkXCIgJiYgU3ltYm9sLnRvUHJpbWl0aXZlICE9IG51bGwgJiZcblx0ICAgICAgdHlwZW9mIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0gPT09IFwiZnVuY3Rpb25cIikge1xuXHQgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oXCJzdHJpbmdcIiksIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCk7XG5cdCAgfVxuXG5cdCAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJHt0eXBlb2YgdmFsdWV9YCk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnVmZmVyOyIsImltcG9ydCBCdWZmZXIgZnJvbSBcIi4vYnVmZmVyXCI7XG5cbmV4cG9ydCBjb25zdCBTVVBFUl9OT0RFX0lEID0gXCIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwXCI7XG5cbmV4cG9ydCBjb25zdCBNT0RFX0ZJTEUgPSBcIkZJTEVcIjtcbmV4cG9ydCBjb25zdCBNT0RFX0RJUkVDVE9SWSA9IFwiRElSRUNUT1JZXCI7XG5leHBvcnQgY29uc3QgTU9ERV9TWU1CT0xJQ19MSU5LID0gXCJNT0RFX1NZTUJPTElDX0xJTktcIjtcbmV4cG9ydCBjb25zdCBNT0RFX01FVEEgPSBcIk1FVEFcIjtcbmV4cG9ydCBjb25zdCBNT0RFX1NPQ0tFVCA9IFwiU09DS0VUXCI7XG5leHBvcnQgY29uc3QgTU9ERV9GSUZPID0gXCJGSUZPXCI7XG5leHBvcnQgY29uc3QgTU9ERV9DSEFSQUNURVJfREVWSUNFID0gXCJDSEFSQUNURVJfREVWSUNFXCI7XG5leHBvcnQgY29uc3QgTU9ERV9CTE9DS19ERVZJQ0UgPSBcIkJMT0NLX0RFVklDRVwiO1xuXG5leHBvcnQgY29uc3QgUk9PVF9ESVJFQ1RPUllfTkFNRSA9IFwiL1wiOyAvLyBiYXNlbmFtZShub3JtYWxpemUocGF0aCkpXG5cbmV4cG9ydCBjb25zdCBTVERJTiA9IDA7XG5leHBvcnQgY29uc3QgU1RET1VUID0gMTtcbmV4cG9ydCBjb25zdCBTVERFUlIgPSAyO1xuXG5leHBvcnQgY29uc3QgRklSU1RfREVTQ1JJUFRPUiA9IDM7XG5cbmV4cG9ydCBjb25zdCBOX1ZGU19ERVNDUklQVE9SUyA9IDEwMjQ7XG5cbmV4cG9ydCBjb25zdCBEQVRBX0JMT0NLX1NFUEFSQVRPUiA9IFwiI1wiO1xuXG5leHBvcnQgY29uc3QgTU5UX1JFQURfT05MWSA9IFwiUkVBRF9PTkxZXCI7XG5cbmV4cG9ydCBjb25zdCBTWU1MT09QX01BWCA9IDEwOyIsImltcG9ydCB7IEZJUlNUX0RFU0NSSVBUT1IsIE5fVkZTX0RFU0NSSVBUT1JTLCBTVERJTiwgU1RET1VULCBTVERFUlIgfSBmcm9tIFwiLi4vY29tbW9uL2NvbnN0YW50c1wiO1xuXG5jb25zdCBfXyA9IG5ldyBXZWFrTWFwKCk7XG5cbmNsYXNzIEZETWFwXG57XG5cdGNvbnN0cnVjdG9yKHNpemU9Tl9WRlNfREVTQ1JJUFRPUlMpXG5cdHtcblx0XHRjb25zdCBtYXAgPSBuZXcgQXJyYXkoc2l6ZSkuZmlsbCgwKTtcblxuXHRcdG1hcFtTVERJTl0gPSAxO1xuXHRcdG1hcFtTVERPVVRdID0gMTtcblx0XHRtYXBbU1RERVJSXSA9IDE7XG5cblx0XHRfXy5zZXQodGhpcywge1xuXHRcdFx0bWFwOiBtYXAsXG5cdFx0XHRuZXh0OiBGSVJTVF9ERVNDUklQVE9SLFxuXHRcdH0pO1xuXHR9XG5cblx0Y2xhaW1VbnVzZWQoKVxuXHR7XHRcdFxuXHRcdGNvbnN0IG1hcCA9IF9fLmdldCh0aGlzKS5tYXA7XG5cdFx0bGV0IG5leHQgPSBfXy5nZXQodGhpcykubmV4dDtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBtYXAubGVuZ3RoOyArKyBpKVxuXHRcdHtcblx0XHRcdGxldCBmZCA9IChuZXh0K2kpICUgbWFwLmxlbmd0aDtcblx0XHRcdGlmKDAgPT0gbWFwW2ZkXSkge1xuXHRcdFx0XHR0aGlzLmNsYWltKGZkKTtcblx0XHRcdFx0cmV0dXJuIGZkO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcihgdW5hYmxlIHRvIGFsbG9jYXRlIGZpbGUgZGVzY3JpcHRvcmApO1xuXHR9XG5cblx0Y2xhaW0oZmQpXG5cdHtcdFx0XG5cdFx0X18uZ2V0KHRoaXMpLm1hcFtmZF0gPSAxO1xuXHR9XG5cblx0cmVsZWFzZShmZClcblx0e1xuXHRcdF9fLmdldCh0aGlzKS5tYXBbZmRdID0gMDtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBGRE1hcDsiLCJjb25zdCBfXyA9IG5ldyBXZWFrTWFwKCk7XG5cbmNsYXNzIFZGU01vdW50XG57XG5cdGNvbnN0cnVjdG9yKHsgcGFyZW50VkZTTW91bnQgPSBudWxsLCBmbGFncyA9IFtdLCBmcywgcm5vZGUgPSBudWxsIH0gPSB7fSlcblx0e1xuXHRcdF9fLnNldCh0aGlzLCB7XG5cdFx0XHRmbGFnczogZmxhZ3MsXG5cdFx0XHRmczogZnMsXG5cdFx0XHRybm9kZTogcm5vZGUsXG5cblx0XHRcdHBhcmVudDogcGFyZW50VkZTTW91bnQsXG5cdFx0XHRjaGlsZHJlbjogbmV3IFNldCgpLFxuXHRcdH0pO1xuXG5cdFx0aWYocGFyZW50VkZTTW91bnQpIHtcblx0XHRcdHBhcmVudFZGU01vdW50Lmluc2VydENoaWxkKHRoaXMpO1xuXHRcdH1cblx0fVxuXG5cdGdldCBmcygpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5mcyB9XG5cblx0Z2V0IHJub2RlKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnJub2RlIH1cblxuXHRnZXQgZmxhZ3MoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZmxhZ3MgfVxuXG5cdGdldCBwYXJlbnQoKSB7IHJldHVybiBfXy5nZXQodGhpcykucGFyZW50IH1cblxuXHRnZXQgY2hpbGRyZW4oKSB7IHJldHVybiBfXy5nZXQodGhpcykuY2hpbGRyZW4gfVxuXG5cdGhhc0NoaWxkcmVuKClcblx0e1xuXHRcdGNvbnN0IHNlbGYgPSBfXy5nZXQodGhpcyk7XG5cblx0XHRyZXR1cm4gdGhpcy5jaGlsZHJlbi5zaXplID4gMDtcblx0fVxuXG5cdGluc2VydENoaWxkKHZmc01vdW50KVxuXHR7XG5cdFx0Y29uc3Qgc2VsZiA9IF9fLmdldCh0aGlzKTtcblx0XHRcblx0XHRzZWxmLmNoaWxkcmVuLmFkZCh2ZnNNb3VudCk7XG5cdH1cblxuXHRyZW1vdmVDaGlsZCh2ZnNNb3VudClcblx0e1xuXHRcdGNvbnN0IHNlbGYgPSBfXy5nZXQodGhpcyk7XG5cblx0XHRzZWxmLmNoaWxkcmVuLmRlbGV0ZSh2ZnNNb3VudCk7XG5cdH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IFZGU01vdW50OyIsImltcG9ydCB7IE1PREVfTUVUQSB9IGZyb20gXCIuLi9jb21tb24vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBTVVBFUl9OT0RFX0lEIH0gZnJvbSBcIi4uL2NvbW1vbi9jb25zdGFudHNcIjtcbmltcG9ydCBVVUlEIGZyb20gXCIuLi9jb21tb24vdXVpZFwiO1xuXG5jb25zdCBfXyA9IG5ldyBXZWFrTWFwKCk7XG5cbmNsYXNzIFN1cGVyTm9kZURhdGFcbntcblx0Y29uc3RydWN0b3IoeyBkZXYsIGF0aW1lID0gRGF0ZS5ub3coKSwgbXRpbWUgPSBEYXRlLm5vdygpLCBjdGltZSA9IERhdGUubm93KCksIHJub2RlLCB2ZXJzaW9uID0gVVVJRC5zaG9ydCgpIH0gPSB7fSlcblx0e1xuXHRcdF9fLnNldCh0aGlzLCB7XG5cdFx0XHRkZXY6IGRldixcblx0XHRcdG1vZGU6IE1PREVfTUVUQSxcblx0XHRcdGF0aW1lOiBhdGltZSB8fCBEYXRlLm5vdygpLCAvLyBhY2Nlc3MgdGltZSAod2lsbCBtaXJyb3IgY3RpbWUgYWZ0ZXIgY3JlYXRpb24pXG5cdFx0XHRtdGltZTogbXRpbWUgfHwgRGF0ZS5ub3coKSwgLy8gY3JlYXRpb24vY2hhbmdlIHRpbWVcblx0XHRcdGN0aW1lOiBjdGltZSB8fCBEYXRlLm5vdygpLCAvLyBtb2RpZmllZCB0aW1lXG5cdFx0XHRybm9kZTogcm5vZGUsIC8vIHJvb3Qgbm9kZVxuXHRcdFx0dmVyc2lvbjogdmVyc2lvbixcblx0XHR9KTtcblx0fVxuXG5cdGdldCBkZXYoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGV2IH1cblxuXHRnZXQgbW9kZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5tb2RlIH1cblxuXHRnZXQgYXRpbWUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuYXRpbWUgfVxuXHRzZXQgYXRpbWUodmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5hdGltZSA9IHZhbHVlIH1cblxuXHRnZXQgbXRpbWUoKSB7IHJldHVybiBfXy5nZXQodGhpcykubXRpbWUgfVxuXHRzZXQgbXRpbWUodmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5tdGltZSA9IHZhbHVlIH1cblxuXHRnZXQgY3RpbWUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuY3RpbWUgfVxuXHRzZXQgY3RpbWUodmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5jdGltZSA9IHZhbHVlIH1cblxuXHRnZXQgdmVyc2lvbigpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS52ZXJzaW9uIH1cblx0c2V0IHZlcnNpb24odmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS52ZXJzaW9uID0gdmFsdWUgfVxuXG5cdGdldCBybm9kZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5ybm9kZSB9XG5cdHNldCBybm9kZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnJub2RlID0gdmFsdWUgfVxuXG5cdHRvSlNPTigpXG5cdHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZGV2OiB0aGlzLmRldixcblx0XHRcdG1vZGU6IHRoaXMubW9kZSxcblx0XHRcdGF0aW1lOiB0aGlzLmF0aW1lLFxuXHRcdFx0bXRpbWU6IHRoaXMubXRpbWUsXG5cdFx0XHRjdGltZTogdGhpcy5jdGltZSxcblx0XHRcdHJub2RlOiB0aGlzLnJub2RlLFxuXHRcdFx0dmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuXHRcdH07XG5cdH1cbn1cblxuY2xhc3MgU3VwZXJOb2RlXG57XG5cdGNvbnN0cnVjdG9yKHsgZnMsIGRhdGEgfSA9IHt9KVxuXHR7XG5cdFx0X18uc2V0KHRoaXMsIHtcblx0XHRcdGZzOiBmcyxcblx0XHRcdGlkOiBTVVBFUl9OT0RFX0lELFx0XHRcdFxuXG5cdFx0XHRkYXRhOiBuZXcgU3VwZXJOb2RlRGF0YShkYXRhKSxcblx0XHR9KTtcblx0fVxuXG5cdGdldCBpZCgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5pZCB9XG5cblx0Z2V0IGZzKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmZzIH1cblxuXHRnZXQgZGV2KCkge1x0cmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLmRldiB9XG5cblx0Z2V0IG1vZGUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5tb2RlIH1cblxuXHRnZXQgYXRpbWUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5hdGltZSB9XG5cdHNldCBhdGltZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuYXRpbWUgPSB2YWx1ZSB9XG5cblx0Z2V0IG10aW1lKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEubXRpbWUgfVxuXHRzZXQgbXRpbWUodmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLm10aW1lID0gdmFsdWUgfVxuXG5cdGdldCBjdGltZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLmN0aW1lIH1cblx0c2V0IGN0aW1lKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5jdGltZSA9IHZhbHVlIH1cdFxuXG5cdGdldCBybm9kZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLnJub2RlIH1cblx0c2V0IHJub2RlKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5ybm9kZSA9IHZhbHVlIH1cblxuXHRnZXQgdmVyc2lvbigpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLnZlcnNpb24gfVxuXHRzZXQgdmVyc2lvbih2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEudmVyc2lvbiA9IHZhbHVlIH1cblxuXHRnZXQgZGF0YSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLnRvSlNPTigpIH1cblxuXHRzdGF0aWMgYXN5bmMgcmVhZChmcylcblx0e1xuXHRcdGxldCBkYXRhID0gYXdhaXQgZnMucmVhZE5vZGUoU1VQRVJfTk9ERV9JRCk7XG5cdFx0cmV0dXJuIG5ldyBTdXBlck5vZGUoeyBmczogZnMsIGRhdGE6IGRhdGEgfSk7XG5cdH1cblxuXHRhc3luYyByZWFkKClcblx0e1xuXHRcdGxldCBkYXRhID0gYXdhaXQgdGhpcy5mcy5yZWFkTm9kZSh0aGlzLmlkKTtcblx0XHRfXy5nZXQodGhpcykuZGF0YSA9IG5ldyBTdXBlck5vZGVEYXRhKGRhdGEpO1xuXHR9XG5cblx0YXN5bmMgd3JpdGUoKVxuXHR7XG5cdFx0dGhpcy52ZXJzaW9uID0gVVVJRC5zaG9ydCgpO1xuXHRcdGF3YWl0IGZzLndyaXRlTm9kZSh0aGlzLmlkLCB0aGlzLmRhdGEpO1xuXHR9XG5cblx0dG9KU09OKClcblx0e1xuXHRcdHJldHVybiB7XG5cdFx0XHRpZDogdGhpcy5pZCxcblx0XHRcdGRhdGE6IF9fLmdldCh0aGlzKS5kYXRhLnRvSlNPTigpLFxuXHRcdH1cblx0fVx0XG5cblx0dG9TdHJpbmcoKVxuXHR7XG5cdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMudG9KU09OKCkpO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFN1cGVyTm9kZTsiLCJpbXBvcnQgVVVJRCBmcm9tIFwiLi4vY29tbW9uL3V1aWRcIjtcbmltcG9ydCB7IE1PREVfRklMRSwgTU9ERV9ESVJFQ1RPUlksIE1PREVfU1lNQk9MSUNfTElOSyB9IGZyb20gXCIuLi9jb21tb24vY29uc3RhbnRzXCI7XG5pbXBvcnQgQnVmZmVyIGZyb20gXCIuLi9jb21tb24vYnVmZmVyXCI7XG5pbXBvcnQgRSBmcm9tIFwiLi4vY29tbW9uL2Vycm9yc1wiO1xuXG5jb25zdCBfXyA9IG5ldyBXZWFrTWFwKCk7XG5cbmNsYXNzIE5vZGVEYXRhXG57XG5cdGNvbnN0cnVjdG9yKHsgbW9kZSwgc2l6ZSA9IDAsIGF0aW1lLCBtdGltZSwgY3RpbWUsIHZlcnNpb24gPSBVVUlELnNob3J0KCksIGZsYWdzLCB4YXR0cnMsIG5saW5rcywgYmxrc2l6ZSwgbmJsb2NrcywgYmxraWQgPSBVVUlELnNob3J0KCkgfSlcblx0e1xuXHRcdF9fLnNldCh0aGlzLCB7XG5cdFx0XHRtb2RlOiBtb2RlLCAvLyBub2RlIHR5cGUgKGZpbGUsIGRpcmVjdG9yeSwgZXRjKVxuXHRcdFx0c2l6ZTogc2l6ZSxcblx0XHRcdGF0aW1lOiBhdGltZSB8fCBEYXRlLm5vdygpLCAvLyBhY2Nlc3MgdGltZSAod2lsbCBtaXJyb3IgY3RpbWUgYWZ0ZXIgY3JlYXRpb24pXG5cdFx0XHRtdGltZTogbXRpbWUgfHwgRGF0ZS5ub3coKSwgLy8gY3JlYXRpb24vY2hhbmdlIHRpbWVcblx0XHRcdGN0aW1lOiBjdGltZSB8fCBEYXRlLm5vdygpLCAvLyBtb2RpZmllZCB0aW1lXG5cdFx0XHR2ZXJzaW9uOiB2ZXJzaW9uIHx8IFVVSUQuc2hvcnQoKSxcblx0XHRcdGZsYWdzOiBmbGFncyB8fCBbXSxcblx0XHRcdHhhdHRyczogeGF0dHJzIHx8IHt9LFxuXHRcdFx0bmxpbmtzOiBubGlua3MgfHwgMCxcblx0XHRcdGJsa3NpemU6IGJsa3NpemUgfHwgNDA5Nixcblx0XHRcdG5ibG9ja3M6IG5ibG9ja3MgfHwgMCxcblx0XHRcdGJsa2lkOiBibGtpZCxcblx0XHR9KTtcblx0fVxuXG5cdGdldCBtb2RlKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLm1vZGUgfVxuXG5cdGdldCBhdGltZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5hdGltZSB9XG5cdHNldCBhdGltZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmF0aW1lID0gdmFsdWUgfVxuXG5cdGdldCBtdGltZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5tdGltZSB9XG5cdHNldCBtdGltZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLm10aW1lID0gdmFsdWUgfVxuXG5cdGdldCBjdGltZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5jdGltZSB9XG5cdHNldCBjdGltZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmN0aW1lID0gdmFsdWUgfVxuXG5cdGdldCB2ZXJzaW9uKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnZlcnNpb24gfVxuXHRzZXQgdmVyc2lvbih2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnZlcnNpb24gPSB2YWx1ZSB9XG5cblx0Z2V0IGZsYWdzKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmZsYWdzIH1cblx0XG5cdGdldCB4YXR0cnMoKSB7IHJldHVybiBfXy5nZXQodGhpcykueGF0dHJzIH1cblxuXHRnZXQgbmxpbmtzKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLm5saW5rcyB9XG5cdHNldCBubGlua3ModmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5ubGlua3MgPSB2YWx1ZSB9XG5cblx0Z2V0IGJsa3NpemUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuYmxrc2l6ZSB9XG5cdFxuXHRnZXQgbmJsb2NrcygpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5uYmxvY2tzIH1cblx0c2V0IG5ibG9ja3ModmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5uYmxvY2tzID0gdmFsdWUgfVxuXG5cdGdldCBibGtpZCgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5ibGtpZCB9XG5cdHNldCBibGtpZCh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmJsa2lkID0gdmFsdWUgfVxuXG5cdGdldCBzaXplKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnNpemUgfVxuXHRzZXQgc2l6ZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnNpemUgPSB2YWx1ZSB9XHRcblxuXHR0b0pTT04oKVxuXHR7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG1vZGU6IHRoaXMubW9kZSxcblx0XHRcdHNpemU6IHRoaXMuc2l6ZSxcblx0XHRcdGF0aW1lOiB0aGlzLmF0aW1lLFxuXHRcdFx0bXRpbWU6IHRoaXMubXRpbWUsXG5cdFx0XHRjdGltZTogdGhpcy5jdGltZSxcblx0XHRcdG5saW5rczogdGhpcy5ubGlua3MsXG5cdFx0XHR2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG5cdFx0XHRibGtzaXplOiB0aGlzLmJsa3NpemUsXG5cdFx0XHRuYmxvY2tzOiB0aGlzLm5ibG9ja3MsXG5cdFx0XHRibGtpZDogdGhpcy5ibGtpZCxcblx0XHRcdGZsYWdzOiB0aGlzLmZsYWdzLFxuXHRcdFx0eGF0dHJzOiB0aGlzLnhhdHRycyxcblx0XHR9O1xuXHR9XHRcbn1cblxuY2xhc3MgTm9kZVxue1xuXHRjb25zdHJ1Y3Rvcih7IGZzLCBpZCA9IFVVSUQuc2hvcnQoKSwgZGF0YSB9ID0ge30pXG5cdHtcblx0XHRfXy5zZXQodGhpcywge1xuXHRcdFx0ZnM6IGZzLFxuXHRcdFx0aWQ6IGlkLFx0XHRcdFxuXG5cdFx0XHRkYXRhOiBuZXcgTm9kZURhdGEoZGF0YSksXG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgZnMoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZnMgfVxuXG5cdGdldCBpZCgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5pZCB9XG5cdFxuXHRnZXQgc2l6ZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLnNpemUgfVxuXHRzZXQgc2l6ZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuc2l6ZSA9IHZhbHVlIH1cblxuXHRnZXQgbmxpbmtzKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEubmxpbmtzIH1cblx0c2V0IG5saW5rcyh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEubmxpbmtzID0gdmFsdWUgfVxuXG5cdGdldCB2ZXJzaW9uKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEudmVyc2lvbiB9XG5cdHNldCB2ZXJzaW9uKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS52ZXJzaW9uID0gdmFsdWUgfVxuXG5cdGdldCBibGtzaXplKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuYmxrc2l6ZSB9XG5cblx0Z2V0IG5ibG9ja3MoKSB7XHRyZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEubmJsb2Nrc1x0fVxuXHRzZXQgbmJsb2Nrcyh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEubmJsb2NrcyA9IHZhbHVlIH1cblxuXHRnZXQgYXRpbWUoKVx0eyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuYXRpbWUgfVxuXHRzZXQgYXRpbWUodmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLmF0aW1lID0gdmFsdWUgfVxuXG5cdGdldCBtdGltZSgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5kYXRhLm10aW1lIH1cblx0c2V0IG10aW1lKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5tdGltZSA9IHZhbHVlIH1cblxuXHRnZXQgY3RpbWUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5jdGltZSB9XG5cdHNldCBjdGltZSh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuY3RpbWUgPSB2YWx1ZSB9XG5cblx0Z2V0IG1vZGUoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5tb2RlIH1cblxuXHRnZXQgYmxraWQoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS5ibGtpZCB9XG5cdHNldCBibGtpZCh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuYmxraWQgPSB2YWx1ZSB9XG5cblx0Z2V0IGZsYWdzKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEuZmxhZ3MgfVxuXG5cdGdldCB4YXR0cnMoKSB7IHJldHVybiBfXy5nZXQodGhpcykuZGF0YS54YXR0cnMgfVxuXG5cdGdldCBkYXRhKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmRhdGEudG9KU09OKCkgfVxuXG5cdGlzRmlsZSgpIFxuXHR7IFxuXHRcdHJldHVybiBNT0RFX0ZJTEUgPT0gdGhpcy5tb2RlO1xuXHR9XG5cblx0aXNEaXJlY3RvcnkoKSBcblx0e1xuXHRcdHJldHVybiBNT0RFX0RJUkVDVE9SWSA9PSB0aGlzLm1vZGU7XG5cdH1cblxuXHRpc1N5bWJvbGljTGluaygpXG5cdHtcblx0XHRyZXR1cm4gTU9ERV9TWU1CT0xJQ19MSU5LID09IHRoaXMubW9kZTtcblx0fVxuXG5cdGlzU29ja2V0KClcblx0e1xuXHRcdHJldHVybiBNT0RFX1NPQ0tFVCA9PSB0aGlzLm1vZGU7XG5cdH1cblxuXHRpc0ZJRk8oKVxuXHR7XG5cdFx0cmV0dXJuIE1PREVfRklGTyA9PSB0aGlzLm1vZGU7XG5cdH1cblxuXHRpc0NoYXJhY3RlckRldmljZSgpXG5cdHtcblx0XHRyZXR1cm4gTU9ERV9DSEFSQUNURVJfREVWSUNFID09IHRoaXMubW9kZTtcblx0fVxuXG5cdGlzQmxvY2tEZXZpY2UoKVxuXHR7XG5cdFx0cmV0dXJuIE1PREVfQkxPQ0tfREVWSUNFID09IHRoaXMubW9kZTtcblx0fVxuXG5cdHRvU3RyaW5nKClcblx0e1xuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRvSlNPTigpKTtcblx0fVxuXG5cdHN0YXRpYyBoYXNoKGZzLCBpZClcblx0e1xuXHRcdHJldHVybiBgJHtmcy5pZH0ke2lkfWA7XG5cdH1cblxuXHRoYXNoKClcblx0e1xuXHRcdHJldHVybiBOb2RlLmhhc2godGhpcy5mcywgdGhpcy5pZCk7XG5cdH1cblxuXHRzdGF0aWMgYXN5bmMgcmVhZChmcywgaWQpXG5cdHtcblx0XHRsZXQgZGF0YSA9IGF3YWl0IGZzLnJlYWROb2RlKGlkKTtcblx0XHRyZXR1cm4gbmV3IE5vZGUoeyBmczogZnMsIGlkOiBpZCwgZGF0YTogZGF0YSB9KTtcblx0fVxuXG5cdGFzeW5jIHJlYWQoKVxuXHR7XG5cdFx0bGV0IGRhdGEgPSBhd2FpdCB0aGlzLmZzLnJlYWROb2RlKHRoaXMuaWQpO1xuXHRcdF9fLmdldCh0aGlzKS5kYXRhID0gbmV3IE5vZGVEYXRhKGRhdGEpO1xuXHR9XG5cblx0YXN5bmMgd3JpdGUoKVxuXHR7XG5cdFx0dGhpcy52ZXJzaW9uID0gVVVJRC5zaG9ydCgpO1xuXHRcdHJldHVybiBhd2FpdCB0aGlzLmZzLndyaXRlTm9kZSh0aGlzLmlkLCB0aGlzLmRhdGEpO1xuXHR9XG5cblx0YXN5bmMgcmVhZERhdGEoYmxvY2s9MClcblx0e1xuXHRcdGxldCBkYXRhID0gYXdhaXQgdGhpcy5mcy5yZWFkRGF0YSh0aGlzLmJsa2lkLCBibG9jayk7XG5cblx0XHRyZXR1cm4gZGF0YTtcblx0fVxuXG5cdGFzeW5jIHdyaXRlRGF0YShibG9jaz0wLCBkYXRhKVxuXHR7XG5cdFx0dGhpcy5uYmxvY2tzID0gYmxvY2sgKyAxO1xuXHRcdGF3YWl0IHRoaXMuZnMud3JpdGVEYXRhKHRoaXMuYmxraWQsIGJsb2NrLCBkYXRhKTtcblx0fVxuXG5cdGFzeW5jIHZhbGlkYXRlKClcblx0e1xuXHRcdFxuXHR9XG5cblx0dG9KU09OKClcblx0e1xuXHRcdHJldHVybiB7XG5cdFx0XHRmczogdGhpcy5mcy5pZCxcblx0XHRcdGlkOiB0aGlzLmlkLFxuXHRcdFx0ZGF0YTogX18uZ2V0KHRoaXMpLmRhdGEudG9KU09OKCksXG5cdFx0fVxuXHR9XHRcblxuXHR0b1N0cmluZygpXG5cdHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy50b0pTT04oKSk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTm9kZTsiLCJpbXBvcnQgRlMgZnJvbSBcIi4uL2ZzXCI7XG5pbXBvcnQgU3VwZXJOb2RlIGZyb20gXCIuLi9zdXBlci1ub2RlXCI7XG5pbXBvcnQgTm9kZSBmcm9tIFwiLi4vbm9kZVwiO1xuaW1wb3J0IFVVSUQgZnJvbSBcIi4uLy4uL2NvbW1vbi91dWlkXCI7XG5pbXBvcnQgeyBNT0RFX0RJUkVDVE9SWSwgTU9ERV9GSUxFLCBEQVRBX0JMT0NLX1NFUEFSQVRPUiB9IGZyb20gXCIuLi8uLi9jb21tb24vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBTVVBFUl9OT0RFX0lEIH0gZnJvbSBcIi4uLy4uL2NvbW1vbi9jb25zdGFudHNcIjtcbmltcG9ydCBFIGZyb20gXCIuLi8uLi9jb21tb24vZXJyb3JzXCI7XG5cbmNvbnN0IF9fID0gbmV3IFdlYWtNYXAoKTtcblxuLypcblx0Um9vdEZTIGlzIGEgcmVhZC1vbmx5IGZpbGUgc3lzdGVtIGNvbnRhaW5pbmcgZXhhY3RseSBvbmVcblx0ZGlyZWN0b3J5IG5vZGUuIEl0IGlzIGNyZWF0ZWQgYXV0b21hdGljYWxseSBieSB0aGUgVkZTXG5cdGxheWVyLiBJdHMgb25seSBwdXJwb3NlIGlzIHRvIGFsbG93IHRoZSBWRlMgdG8gbW91bnQgYW5vdGhlclxuXHRmaWxlIHN5c3RlbSBvbiB0b3Agb2YgaXRzIG9ubHkgbm9kZS5cbiAqL1xuXG5jbGFzcyBSb290RlMgZXh0ZW5kcyBGU1xue1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zPXt9KVxuXHR7XHRcdFxuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXG5cdFx0bGV0IHN1cGVyTm9kZSA9IG5ldyBTdXBlck5vZGUoeyBmczogdGhpcywgZGF0YTogeyBkZXY6IFVVSUQuc2hvcnQoKSB9IH0pO1xuXG5cdFx0bGV0IHJvb3ROb2RlID0gbmV3IE5vZGUoeyBmczogdGhpcywgZGF0YTogeyBtb2RlOiBNT0RFX0RJUkVDVE9SWSwgbmxpbmtzOiAxIH0gfSk7XG5cdFx0c3VwZXJOb2RlLnJub2RlID0gcm9vdE5vZGUuaWQ7XG5cblx0XHRsZXQgc3RvcmFnZSA9IG5ldyBNYXAoKTtcblx0XHRzdG9yYWdlLnNldChzdXBlck5vZGUuaWQsIHN1cGVyTm9kZS5kYXRhKTtcblx0XHRzdG9yYWdlLnNldChyb290Tm9kZS5pZCwgcm9vdE5vZGUuZGF0YSk7XG5cblx0XHRfXy5zZXQodGhpcywge1xuXHRcdFx0c3RvcmFnZTogc3RvcmFnZSxcblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBnZXQgdHlwZSgpXG5cdHtcblx0XHRyZXR1cm4gXCJyb290ZnNcIjtcblx0fVxuXG5cdHN0YXRpYyBhc3luYyBtb3VudCgpXG5cdHtcblx0XHR0aHJvdyBuZXcgRS5VTktOT1dOKFwibW91bnQgb3BlcmF0aW9uIG5vdCBhdmFpbGFibGUgZm9yIHJvb3Rmc1wiKTtcblx0fVxuXG5cdGFzeW5jIHVtb3VudCgpXG5cdHtcblx0XHR0aHJvdyBuZXcgRS5VTktOT1dOKFwidW1vdW50IG9wZXJhdGlvbiBub3QgYXZhaWxhYmxlIGZvciByb290ZnNcIik7XG5cdH1cdFxuXG5cdGFzeW5jIHJlYWROb2RlKGlkKVxuXHR7XG5cdFx0bGV0IG5vZGUgPSBfXy5nZXQodGhpcykuc3RvcmFnZS5nZXQoaWQpO1x0XHRcblxuXHRcdGlmKCFub2RlKSB7XG5cdFx0XHR0aHJvdyBuZXcgRS5FTk9FTlQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbm9kZTtcblx0fVxuXG5cdGFzeW5jIHdyaXRlTm9kZShpZCwgbm9kZSlcblx0e1xuXHRcdHRocm93IG5ldyBFLkVST0ZTKCk7XG5cdH1cblxuXHRhc3luYyByZWFkRGF0YShpZCwgYmxvY2s9MClcblx0e1xuXHRcdGxldCBkYXRhID0gX18uZ2V0KHRoaXMpLnN0b3JhZ2UuZ2V0KGAke2lkfSR7REFUQV9CTE9DS19TRVBBUkFUT1J9JHtibG9ja31gKTtcblxuXHRcdGlmKCFkYXRhKSB7XG5cdFx0XHR0aHJvdyBuZXcgRS5FSU8oKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGF0YTtcblx0fVxuXG5cdGFzeW5jIHdyaXRlRGF0YShpZCwgYmxvY2ssIGRhdGEpXG5cdHtcblx0XHR0aHJvdyBuZXcgRS5FUk9GUygpO1xuXHR9XG5cblx0YXN5bmMgZnN5bmMoKVxuXHR7XG5cblx0fVxuXG5cdGFzeW5jIHZhbGlkYXRlKGlkKVxuXHR7XG5cblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb290RlM7IiwiaW1wb3J0IEUgZnJvbSBcIi4vZXJyb3JzXCI7XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAgIC9eKFxcLz8pKFtcXHNcXFNdK1xcLyg/ISQpfFxcLyk/KCg/OlxcLnsxLDJ9JHxbXFxzXFxTXSs/KT8oXFwuW14uXFwvXSopPykkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSk7XG4gIHJldHVybiBbcmVzdWx0WzFdIHx8ICcnLCByZXN1bHRbMl0gfHwgJycsIHJlc3VsdFszXSB8fCAnJywgcmVzdWx0WzRdIHx8ICcnXTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICAvLyBYWFhmaWxlcjogd2UgZG9uJ3QgaGF2ZSBwcm9jZXNzLmN3ZCgpIHNvIHdlIHVzZSAnLycgYXMgYSBmYWxsYmFja1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiAnLyc7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnIHx8ICFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJykuZmlsdGVyKGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHBhdGguc3Vic3RyKC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkocGF0aC5zcGxpdCgnLycpLmZpbHRlcihmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICAvKlxuICAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgcGF0aCArPSAnLyc7XG4gICB9XG4gICAqL1xuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBqb2luKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gbm9ybWFsaXplKHBhdGhzLmZpbHRlcihmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIHJldHVybiBwICYmIHR5cGVvZiBwID09PSAnc3RyaW5nJztcbiAgfSkuam9pbignLycpKTtcbn1cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbmV4cG9ydCBmdW5jdGlvbiByZWxhdGl2ZShmcm9tLCB0bykge1xuICBmcm9tID0gcmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gcmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlybmFtZShwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlbmFtZShwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICAvLyBYWFhmaWxlcjogbm9kZS5qcyBqdXN0IGRvZXMgYHJldHVybiBmYFxuICByZXR1cm4gZiA9PT0gXCJcIiA/IFwiL1wiIDogZjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dG5hbWUocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZShwYXRoKSB7XG4gIGlmKHBhdGguY2hhckF0KDApID09PSAnLycpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bGwocGF0aCkge1xuICBpZiAoKCcnICsgcGF0aCkuaW5kZXhPZignXFx1MDAwMCcpICE9PSAtMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gTWFrZSBzdXJlIHdlIGRvbid0IGRvdWJsZS1hZGQgYSB0cmFpbGluZyBzbGFzaCAoZS5nLiwgJy8nIC0+ICcvLycpXG5leHBvcnQgZnVuY3Rpb24gYWRkVHJhaWxpbmcocGF0aCkge1xuICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC8qJC8sICcvJyk7XG59XG5cbi8vIERlYWwgd2l0aCBtdWx0aXBsZSBzbGFzaGVzIGF0IHRoZSBlbmQsIG9uZSwgb3Igbm9uZVxuLy8gYW5kIG1ha2Ugc3VyZSB3ZSBkb24ndCByZXR1cm4gdGhlIGVtcHR5IHN0cmluZy5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVUcmFpbGluZyhwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyokLywgJycpO1xuICByZXR1cm4gcGF0aCA9PT0gJycgPyAnLycgOiBwYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2socGF0aCkge1xuICBpZighcGF0aCkge1xuICAgIHRocm93IG5ldyBFLkVJTlZBTCgncGF0aCBtdXN0IGJlIGEgc3RyaW5nJywgcGF0aCk7XG4gIH0gZWxzZSBpZihpc051bGwocGF0aCkpIHtcbiAgICB0aHJvdyBuZXcgRS5FSU5WQUwoJ3BhdGggbXVzdCBiZSBhIHN0cmluZyB3aXRob3V0IG51bGwgYnl0ZXMnLCBwYXRoKTtcbiAgfSBlbHNlIGlmKCFpc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgdGhyb3cgbmV3IEUuRUlOVkFMKCdwYXRoIG11c3QgYmUgYWJzb2x1dGUnLCBwYXRoKTtcbiAgfVxufSIsImltcG9ydCBGUyBmcm9tIFwiLi4vaW5kZXhcIjtcbmltcG9ydCBTdXBlck5vZGUgZnJvbSBcIi4uL3N1cGVyLW5vZGVcIjtcbmltcG9ydCBOb2RlIGZyb20gXCIuLi9ub2RlXCI7XG5pbXBvcnQgVVVJRCBmcm9tIFwiLi4vLi4vY29tbW9uL3V1aWRcIjtcbmltcG9ydCBFIGZyb20gXCIuLi8uLi9jb21tb24vZXJyb3JzXCI7XG5pbXBvcnQgeyBNT0RFX0ZJTEUsIE1PREVfRElSRUNUT1JZLCBEQVRBX0JMT0NLX1NFUEFSQVRPUiB9IGZyb20gXCIuLi8uLi9jb21tb24vY29uc3RhbnRzXCI7XG5pbXBvcnQgQnVmZmVyIGZyb20gXCIuLi8uLi9jb21tb24vYnVmZmVyXCI7XG5cbmNvbnN0IF9fID0gbmV3IFdlYWtNYXAoKTtcblxuY2xhc3MgTWVtRlMgZXh0ZW5kcyBGU1xue1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zPXt9KVxuXHR7XHRcdFxuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXG5cdFx0bGV0IHN0b3JhZ2UgPSBuZXcgTWFwKCk7XG5cdFx0XG5cdFx0bGV0IHN1cGVyTm9kZSA9IG5ldyBTdXBlck5vZGUoeyBmczogdGhpcyB9KTtcblx0XHRzdG9yYWdlLnNldChzdXBlck5vZGUuaWQsIHN1cGVyTm9kZSk7XG5cblx0XHRsZXQgcm9vdE5vZGUgPSBuZXcgTm9kZSh7IGZzOiB0aGlzLCBkYXRhOiB7IG1vZGU6IE1PREVfRElSRUNUT1JZIH0gfSk7XG5cdFx0c3RvcmFnZS5zZXQocm9vdE5vZGUuaWQsIHJvb3ROb2RlKTtcblxuXHRcdHN1cGVyTm9kZS5ybm9kZSA9IHJvb3ROb2RlLmlkO1x0XHRcblxuXHRcdF9fLnNldCh0aGlzLCB7XG5cdFx0XHRzdG9yYWdlOiBzdG9yYWdlLFxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdldCB0eXBlKClcblx0e1xuXHRcdHJldHVybiBcIm1lbWZzXCI7XG5cdH1cblxuXHRzdGF0aWMgYXN5bmMgbW91bnQoZGV2PVVVSUQuc2hvcnQoKSwgZmxhZ3M9W10sIG9wdGlvbnM9e30pXG5cdHtcblx0XHRsZXQgZnMgPSBuZXcgTWVtRlMoKTtcblxuXHRcdHJldHVybiBmcztcblx0fVxuXG5cdGFzeW5jIHVtb3VudCgpXG5cdHtcblx0XHRzdXBlci51bW91bnQoKTtcblx0fVxuXG5cdGFzeW5jIHJlYWROb2RlKGlkKVxuXHR7XG5cdFx0bGV0IG5vZGUgPSBfXy5nZXQodGhpcykuc3RvcmFnZS5nZXQoaWQpO1xuXG5cdFx0aWYoIW5vZGUpIHtcblx0XHRcdHRocm93IG5ldyBFLkVOT0VOVCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBub2RlO1xuXHR9XG5cblx0YXN5bmMgd3JpdGVOb2RlKGlkLCBub2RlKVxuXHR7XG5cdFx0X18uZ2V0KHRoaXMpLnN0b3JhZ2Uuc2V0KGlkLCBub2RlKTtcblx0fVxuXG5cdGFzeW5jIHJlYWREYXRhKGlkLCBibG9jaz0wKVxuXHR7XG5cdFx0bGV0IGRhdGEgPSBfXy5nZXQodGhpcykuc3RvcmFnZS5nZXQoYCR7aWR9JHtEQVRBX0JMT0NLX1NFUEFSQVRPUn0ke2Jsb2NrfWApO1xuXG5cdFx0aWYoIWRhdGEpIHtcblx0XHRcdHRocm93IG5ldyBFLkVJTygpO1xuXHRcdH1cblxuXHRcdHJldHVybiBkYXRhO1xuXHR9XG5cblx0YXN5bmMgd3JpdGVEYXRhKGlkLCBibG9jaywgZGF0YSlcblx0e1xuXHRcdF9fLmdldCh0aGlzKS5zdG9yYWdlLnNldChgJHtpZH0ke0RBVEFfQkxPQ0tfU0VQQVJBVE9SfSR7YmxvY2t9YCwgZGF0YSk7XG5cdH1cblxuXHRhc3luYyBmc3luYygpXG5cdHtcblxuXHR9XG5cblx0YXN5bmMgdmFsaWRhdGUoaWQpXG5cdHtcblxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1lbUZTOyIsImltcG9ydCBSb290RlMgZnJvbSBcIi4vcm9vdC1mc1wiO1xuaW1wb3J0IE1lbUZTIGZyb20gXCIuL21lbS1mc1wiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFtSb290RlMudHlwZV06IFJvb3RGUyxcblx0W01lbUZTLnR5cGVdOiBNZW1GUyxcbn07IiwiaW1wb3J0IHsgTU9ERV9GSUxFIH0gZnJvbSBcIi4uL2NvbW1vbi9jb25zdGFudHNcIjtcblxuY29uc3QgX18gPSBuZXcgV2Vha01hcCgpO1xuXG5jbGFzcyBEaXJlY3RvcnlFbnRyeVxue1xuXHRjb25zdHJ1Y3Rvcih7IGlkLCB0eXBlPU1PREVfRklMRSB9ID0ge30pXG5cdHtcblx0XHRfXy5zZXQodGhpcywge1xuXHRcdFx0aWQ6IGlkLFxuXHRcdFx0dHlwZTogdHlwZSxcblx0XHR9KTtcblx0fVxuXG5cdGdldCBpZCgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5pZCB9XG5cblx0Z2V0IHR5cGUoKSB7IHJldHVybiBfXy5nZXQodGhpcykudHlwZSB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdG9yeUVudHJ5OyIsImNvbnN0IF9fID0gbmV3IFdlYWtNYXAoKTtcblxuY29uc3QgVVJMX1JFR0VYID0gL14oKFxcdyspXFwrKFxcdyspOik/KFxcL1xcLygoXFx3Kyk/KDooXFx3KykpP0ApPyhbXlxcL1xcPzpdKykoOihcXGQrKSk/KT8oXFwvPyhbXlxcL1xcPyNdW15cXD8jXSopPyk/KFxcPyhbXiNdKykpPygjKFxcdyopKT8vaTtcblxuY2xhc3MgVVJMXG57XG5cdGNvbnN0cnVjdG9yKHVybFN0cmluZylcblx0e1xuXHRcdF9fLnNldCh0aGlzLCB7XG5cblx0XHR9KTtcblx0XHRjb25zdCBzZWxmID0gX18uZ2V0KHRoaXMpO1xuXG5cdCAgICBsZXQgbWF0Y2ggPSB1cmxTdHJpbmcubWF0Y2goVVJMX1JFR0VYKTtcblx0IFxuXHQgXHRzZWxmLm9yaWdpbmFsVVJMID0gbWF0Y2hbMF07XG5cblx0IFx0aWYobWF0Y2hbMl0pIHtcblx0IFx0XHRzZWxmLnByb3RvY29sID0gbWF0Y2hbMl07XG5cdCBcdH1cblxuXHQgICAgaWYobWF0Y2hbM10pIHtcblx0ICAgICAgICBzZWxmLnN1YnByb3RvY29sID0gbWF0Y2hbM107XG5cdCAgICB9XG5cdCBcblx0ICAgIGlmKG1hdGNoWzZdKSB7XG5cdCAgICAgICAgc2VsZi51c2VybmFtZSA9IG1hdGNoWzZdO1xuXHQgICAgfVxuXHQgXG5cdCAgICBpZihtYXRjaFs4XSkge1xuXHQgICAgICAgIHNlbGYucGFzc3dvcmQgPSBtYXRjaFs4XTtcblx0ICAgIH1cblx0IFxuXHQgICAgaWYobWF0Y2hbOV0pIHtcblx0ICAgICAgICBzZWxmLmhvc3QgPSBtYXRjaFs5XTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICBcdHNlbGYuaG9zdCA9IFwiXCI7XG5cdCAgICB9XG5cdCBcblx0ICAgIGlmKG1hdGNoWzExXSkge1xuXHQgICAgICAgIHNlbGYucG9ydCA9IG1hdGNoWzExXTtcblx0ICAgIH1cblxuXHQgICAgaWYobWF0Y2hbMTJdKSB7XG5cdCAgICBcdHNlbGYucGF0aCA9IG1hdGNoWzEyXTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICBcdHNlbGYucGF0aCA9IFwiXCI7XG5cdCAgICB9XG5cblx0ICAgIGlmKG1hdGNoWzE1XSkge1xuXHQgICAgXHRsZXQgcXVlcnlMaXN0ID0gbWF0Y2hbMTVdLnNwbGl0KFwiJlwiKTtcblx0ICAgIFx0bGV0IHF1ZXJ5ID0ge307XG5cdCAgICBcdGZvcihsZXQgaXRlbSBvZiBxdWVyeUxpc3QpIHtcblx0ICAgIFx0XHRsZXQgW2tleSwgdmFsdWVdID0gaXRlbS5zcGxpdChcIj1cIik7XG5cdCAgICBcdFx0aWYoIShxdWVyeS5oYXNPd25Qcm9wZXJ0eShrZXkpKSkge1xuXHQgICAgXHRcdFx0cXVlcnlba2V5XSA9IFtdO1xuXHQgICAgXHRcdH1cblx0ICAgIFx0XHRpZih2YWx1ZSkge1xuXHQgICAgXHRcdFx0cXVlcnlba2V5XS5wdXNoKHZhbHVlKTtcblx0ICAgIFx0XHR9XG5cdCAgICBcdH1cblx0ICAgIFx0c2VsZi5xdWVyeSA9IHF1ZXJ5O1xuXHQgICAgfSBlbHNlIHtcblx0ICAgIFx0c2VsZi5xdWVyeSA9IHt9O1xuXHQgICAgfVxuXG5cdCAgICBpZihtYXRjaFsxN10pIHtcblx0ICAgIFx0c2VsZi5mcmFnbWVudCA9IG1hdGNoWzE3XTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICBcdHNlbGYuZnJhZ21lbnQgPSBcIlwiO1xuXHQgICAgfVxuXHR9XG5cblx0Z2V0IHByb3RvY29sKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnByb3RvY29sIH1cblx0c2V0IHByb3RvY29sKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykucHJvdG9jb2wgPSB2YWx1ZSB9XG5cblx0Z2V0IHN1YnByb3RvY29sKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnN1YnByb3RvY29sIH1cblx0c2V0IHN1YnByb3RvY29sKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuc3VicHJvdG9jb2wgPSB2YWx1ZSB9XG5cblx0Z2V0IHVzZXJuYW1lKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnVzZXJuYW1lIH1cblx0c2V0IHVzZXJuYW1lKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykudXNlcm5hbWUgPSB2YWx1ZSB9XG5cblx0Z2V0IHBhc3N3b3JkKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnBhc3N3b3JkIH1cblx0c2V0IHBhc3N3b3JkKHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykucGFzc3dvcmQgPSB2YWx1ZSB9XG5cblx0Z2V0IGhvc3QoKSB7IHJldHVybiBfXy5nZXQodGhpcykuaG9zdCB9XG5cdHNldCBob3N0KHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuaG9zdCA9IHZhbHVlIH1cblxuXHRnZXQgcG9ydCgpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5wb3J0IH1cblx0c2V0IHBvcnQodmFsdWUpIHsgcmV0dXJuIF9fLmdldCh0aGlzKS5wb3J0ID0gdmFsdWUgfVxuXG5cdGdldCBwYXRoKCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnBhdGggfVxuXHRzZXQgcGF0aCh2YWx1ZSkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnBhdGggPSB2YWx1ZSB9XG5cblx0Z2V0IHF1ZXJ5KCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLnF1ZXJ5IH1cblx0c2V0IHF1ZXJ5KHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykucXVlcnkgPSB2YWx1ZSB9XG5cblx0Z2V0IGZyYWdtZW50KCkgeyByZXR1cm4gX18uZ2V0KHRoaXMpLmZyYWdtZW50IH1cblx0c2V0IGZyYWdtZW50KHZhbHVlKSB7IHJldHVybiBfXy5nZXQodGhpcykuZnJhZ21lbnQgPSB2YWx1ZSB9XG5cblx0dG9KU09OKClcblx0e1xuXHRcdHJldHVybiB7XG5cdFx0XHRwcm90b2NvbDogdGhpcy5wcm90b2NvbCxcblx0XHRcdHN1YnByb3RvY29sOiB0aGlzLnN1YnByb3RvY29sLFxuXHRcdFx0dXNlcm5hbWU6IHRoaXMudXNlcm5hbWUsXG5cdFx0XHRwYXNzd29yZDogdGhpcy5wYXNzd29yZCxcblx0XHRcdGhvc3Q6IHRoaXMuaG9zdCxcblx0XHRcdHBvcnQ6IHRoaXMucG9ydCxcdFx0XHRcblx0XHRcdHBhdGg6IHRoaXMucGF0aCxcblx0XHRcdHF1ZXJ5OiB0aGlzLnF1ZXJ5LFxuXHRcdFx0ZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBVUkw7IiwiaW1wb3J0IEZETWFwIGZyb20gXCIuL2ZkbWFwXCI7XG5pbXBvcnQgVkZTTW91bnQgZnJvbSBcIi4vdmZzbW91bnRcIjtcbmltcG9ydCBSb290RlMgZnJvbSBcIi4uL2ZzL3Byb3ZpZGVycy9yb290LWZzXCI7XG5pbXBvcnQgeyBjaGVjayBhcyBwYXRoQ2hlY2ssIG5vcm1hbGl6ZSwgYmFzZW5hbWUsIGRpcm5hbWUgfSBmcm9tIFwiLi4vY29tbW9uL3BhdGhcIjtcbmltcG9ydCB7IFJPT1RfRElSRUNUT1JZX05BTUUgfSBmcm9tIFwiLi4vY29tbW9uL2NvbnN0YW50c1wiO1xuaW1wb3J0IFByb3ZpZGVycyBmcm9tIFwiLi4vZnMvcHJvdmlkZXJzL2luZGV4XCI7XG5pbXBvcnQgRSBmcm9tIFwiLi4vY29tbW9uL2Vycm9yc1wiO1xuaW1wb3J0IHsgU1VQRVJfTk9ERV9JRCB9IGZyb20gXCIuLi9jb21tb24vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNTlRfUkVBRF9PTkxZIH0gZnJvbSBcIi4uL2NvbW1vbi9jb25zdGFudHNcIjtcbmltcG9ydCB7IFNZTUxPT1BfTUFYIH0gZnJvbSBcIi4uL2NvbW1vbi9jb25zdGFudHNcIjtcbmltcG9ydCB7IE1PREVfRklMRSwgTU9ERV9ESVJFQ1RPUlksIE1PREVfU1lNQk9MSUNfTElOSyB9IGZyb20gXCIuLi9jb21tb24vY29uc3RhbnRzXCI7XG5pbXBvcnQgVVVJRCBmcm9tIFwiLi4vY29tbW9uL3V1aWRcIjtcbmltcG9ydCBEaXJlY3RvcnlFbnRyeSBmcm9tIFwiLi9kaXJlY3RvcnktZW50cnlcIjtcbmltcG9ydCBOb2RlIGZyb20gXCIuLi9mcy9ub2RlXCI7XG5pbXBvcnQgU3VwZXJOb2RlIGZyb20gXCIuLi9mcy9zdXBlci1ub2RlXCI7XG5pbXBvcnQgVVJMIGZyb20gXCIuLi9jb21tb24vdXJsXCI7XG5cbmNvbnN0IF9fID0gbmV3IFdlYWtNYXAoKTtcblxuY2xhc3MgSW50ZXJuYWxWRlNcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0Y29uc3Qgcm9vdEZTID0gbmV3IFJvb3RGUygpO1xuXHRcdGNvbnN0IHJvb3RGU1ZGU01vdW50ID0gbmV3IFZGU01vdW50KHsgZnM6IHJvb3RGUywgZmxhZ3M6IFsgTU5UX1JFQURfT05MWSBdIH0pXHRcdFxuXHRcdGNvbnN0IGZzVkZTTW91bnRzID0gbmV3IFdlYWtNYXAoKTtcblx0XHRmc1ZGU01vdW50cy5zZXQocm9vdEZTLCByb290RlNWRlNNb3VudCk7XG5cblx0XHRfXy5zZXQodGhpcywge1xuXHRcdFx0ZmRNYXA6IG5ldyBGRE1hcCgpLFxuXG5cdFx0XHR2ZnNNb3VudHNSb290OiByb290RlNWRlNNb3VudCxcblx0XHRcdGZzVkZTTW91bnRzOiBmc1ZGU01vdW50cyxcblx0XHRcdHZmc01vdW50czogbmV3IE1hcCgpLFxuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgZmluZE5vZGUoe3BhdGgsIGZvbGxvd1N5bWxpbmtzID0gdHJ1ZX0gPSB7fSwgY29udGV4dClcblx0e1xuXHRcdGNvbnN0IHNlbGYgPSBfXy5nZXQodGhpcyk7XG5cblx0XHRpZighY29udGV4dCkge1xuXHRcdFx0Y29udGV4dCA9IHsgc3ltbGlua3NGb2xsb3dlZDogMCB9O1xuXHRcdH1cblxuXHRcdHBhdGggPSBub3JtYWxpemUocGF0aCk7XG5cdFx0aWYoIXBhdGgpIHtcblx0ICAgIFx0dGhyb3cgbmV3IEUuRU5PRU5UKFwicGF0aCBpcyBhbiBlbXB0eSBzdHJpbmdcIik7XG5cdCAgXHR9XG5cblx0XHRsZXQgbmFtZSA9IGJhc2VuYW1lKHBhdGgpO1xuXHRcdGxldCBwYXJlbnRQYXRoID0gZGlybmFtZShwYXRoKTtcblxuXHRcdGxldCBmcztcblx0XHRsZXQgbm9kZUlkO1xuXHRcdGlmKFJPT1RfRElSRUNUT1JZX05BTUUgPT0gbmFtZSkge1xuXHRcdFx0ZnMgPSBzZWxmLnZmc01vdW50c1Jvb3QuZnM7XG5cdFx0XHRsZXQgc3VwZXJOb2RlID0gYXdhaXQgU3VwZXJOb2RlLnJlYWQoZnMpO1xuXHRcdFx0bm9kZUlkID0gc3VwZXJOb2RlLnJub2RlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgcGFyZW50RGlyZWN0b3J5Tm9kZSA9IGF3YWl0IHRoaXMuZmluZE5vZGUoeyBwYXRoOiBwYXJlbnRQYXRoIH0sIGNvbnRleHQpO1xuXHRcdFx0ZnMgPSBwYXJlbnREaXJlY3RvcnlOb2RlLmZzO1xuXG5cdFx0XHRpZihwYXJlbnREaXJlY3RvcnlOb2RlLm1vZGUgIT09IE1PREVfRElSRUNUT1JZKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFLkVOT1RESVIoXCJhIGNvbXBvbmVudCBvZiB0aGUgcGF0aCBwcmVmaXggaXMgbm90IGEgZGlyZWN0b3J5XCIsIHBhdGgpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgcGFyZW50RGlyZWN0b3J5RGF0YTtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHBhcmVudERpcmVjdG9yeURhdGEgPSBhd2FpdCBwYXJlbnREaXJlY3RvcnlOb2RlLnJlYWREYXRhKCk7XG5cdFx0XHR9IGNhdGNoKGVycm9yKSB7XG5cdFx0XHRcdHBhcmVudERpcmVjdG9yeURhdGEgPSBuZXcgT2JqZWN0KCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKCFwYXJlbnREaXJlY3RvcnlEYXRhLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFLkVOT0VOVChudWxsLCBwYXRoKTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IGRpcmVjdG9yeUVudHJ5ID0gbmV3IERpcmVjdG9yeUVudHJ5KHBhcmVudERpcmVjdG9yeURhdGFbbmFtZV0pO1xuXHRcdFx0bm9kZUlkID0gZGlyZWN0b3J5RW50cnkuaWQ7XG5cdFx0fVxuXG5cdFx0Ly8gRm9sbG93IGFsbCB2ZnNNb3VudHMgb24gdGhpcyBub2RlLlxuXHRcdGxldCBub2RlSGFzaCA9IE5vZGUuaGFzaChmcywgbm9kZUlkKTtcblx0XHR3aGlsZShzZWxmLnZmc01vdW50cy5oYXMobm9kZUhhc2gpKSB7XG5cdFx0XHRsZXQgdmZzTW91bnQgPSAoc2VsZi52ZnNNb3VudHMuZ2V0KG5vZGVIYXNoKSlbMF07XG5cdFx0XHRmcyA9IHZmc01vdW50LmZzO1xuXG5cdFx0XHRpZih2ZnNNb3VudC5ybm9kZSkge1xuXHRcdFx0XHRub2RlSWQgPSB2ZnNNb3VudC5ybm9kZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxldCBzdXBlck5vZGUgPSBhd2FpdCBTdXBlck5vZGUucmVhZChmcyk7XG5cdFx0XHRcdG5vZGVJZCA9IHN1cGVyTm9kZS5ybm9kZTtcblx0XHRcdH1cblxuXHRcdFx0bm9kZUhhc2ggPSBOb2RlLmhhc2goZnMsIG5vZGVJZCk7XG5cdFx0fVx0XHRcblxuXHRcdGxldCBub2RlID0gYXdhaXQgTm9kZS5yZWFkKGZzLCBub2RlSWQpO1xuXG5cdFx0aWYobm9kZS5tb2RlID09IE1PREVfU1lNQk9MSUNfTElOSykge1xuXHRcdFx0Y29udGV4dC5zeW1saW5rc0ZvbGxvd2VkICs9IDE7XG5cblx0XHRcdGlmKGNvbnRleHQuc3ltbGlua3NGb2xsb3dlZCA+IFNZTUxPT1BfTUFYKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFLkVMT09QKG51bGwsIHBhdGgpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgc3ltbGlua1BhdGggPSBhd2FpdCBub2RlLnJlYWREYXRhKCk7XG5cdFx0XHRub2RlID0gYXdhaXQgdGhpcy5maW5kTm9kZSh7IHBhdGg6IHN5bWxpbmtQYXRoIH0sIGNvbnRleHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiBub2RlO1xuXHR9XG5cblx0YXN5bmMgbW91bnQoZnNVUkwsIG1vdW50UGF0aCwgZmxhZ3MsIG9wdGlvbnMpXG5cdHtcblx0XHRjb25zdCBzZWxmID0gX18uZ2V0KHRoaXMpO1xuXG5cdFx0bGV0IG1vdW50UG9pbnQgPSBhd2FpdCB0aGlzLmZpbmROb2RlKHsgcGF0aDogbW91bnRQYXRoIH0pO1xuXG5cdFx0aWYoIW1vdW50UG9pbnQpIHtcblx0XHRcdHRocm93IG5ldyBFLkVOT0VOVChcIm1vdW50IHRhcmdldCBkb2VzIG5vdCBleGlzdFwiKTtcblx0XHR9XG5cblx0XHRsZXQgdXJsID0gbmV3IFVSTChmc1VSTCk7XG5cblx0XHRpZihcImZpbGVyXCIgIT09IHVybC5wcm90b2NvbCkge1xuXHRcdFx0dGhyb3cgbmV3IEUuVU5LTk9XTihcImV4cGVjdGluZyBmaWxlciBwcm90b2NvbFwiKTtcblx0XHR9XG5cblx0XHRsZXQgZGV2ID0gdXJsLnBhdGguc2xpY2UoMSk7XG5cdFx0bGV0IHR5cGUgPSB1cmwuc3VicHJvdG9jb2w7XG5cdFx0XG5cdFx0aWYoISh0eXBlIGluIFByb3ZpZGVycykpIHtcblx0XHRcdHRocm93IG5ldyBFLlVOS05PV04oXCJ1bmtub3duIGZpbGUgc3lzdGVtIHR5cGVcIik7XG5cdFx0fVxuXG5cdFx0bGV0IGZzID0gYXdhaXQgUHJvdmlkZXJzW3R5cGVdLm1vdW50KGRldiwgZmxhZ3MsIG9wdGlvbnMpO1xuXHRcdGxldCBzdXBlck5vZGUgPSBhd2FpdCBmcy5yZWFkTm9kZShTVVBFUl9OT0RFX0lEKTtcblx0XHRsZXQgcm9vdE5vZGUgPSBhd2FpdCBmcy5yZWFkTm9kZShzdXBlck5vZGUucm5vZGUpO1xuXG5cdFx0bGV0IHZmc01vdW50ID0gbmV3IFZGU01vdW50KHsgcGFyZW50OiBzZWxmLmZzVkZTTW91bnRzLmdldChtb3VudFBvaW50LmZzKSwgZmxhZ3M6IGZsYWdzLCBmczogZnMgfSk7XG5cdFx0c2VsZi5mc1ZGU01vdW50cy5zZXQoZnMsIHZmc01vdW50KTtcblxuXHRcdGlmKCFzZWxmLnZmc01vdW50cy5oYXMobW91bnRQb2ludC5oYXNoKCkpKSB7XG5cdFx0XHRzZWxmLnZmc01vdW50cy5zZXQobW91bnRQb2ludC5oYXNoKCksIG5ldyBBcnJheSgpKTtcblx0XHR9XG5cdFx0c2VsZi52ZnNNb3VudHMuZ2V0KG1vdW50UG9pbnQuaGFzaCgpKS51bnNoaWZ0KHZmc01vdW50KTtcblx0fVxuXG5cdGFzeW5jIHVtb3VudChwYXRoKVxuXHR7XG5cdFx0Y29uc3Qgc2VsZiA9IF9fLmdldCh0aGlzKTtcblxuXHRcdGxldCBtb3VudFBvaW50ID0gYXdhaXQgdGhpcy5maW5kTm9kZSh7IHBhdGg6IHBhdGggfSk7XG5jb25zb2xlLmxvZyhzZWxmLnZmc01vdW50cy5rZXlzKCksIG1vdW50UG9pbnQuaGFzaCgpKTtcblx0XHRpZighc2VsZi52ZnNNb3VudHMuaGFzKG1vdW50UG9pbnQuaGFzaCgpKSkge1xuXHRcdFx0dGhyb3cgbmV3IEUuRUlOVkFMKG51bGwsIHBhdGgpO1xuXHRcdH1cblxuXHRcdGxldCB2ZnNNb3VudCA9IHNlbGYudmZzTW91bnRzLmdldChtb3VudFBvaW50Lmhhc2goKSk7XG5cdFx0aWYodmZzTW91bnQuaGFzQ2hpbGRyZW4oKSkge1xuXHRcdFx0dGhyb3cgbmV3IEUuRUJVU1kobnVsbCwgcGF0aCk7XG5cdFx0fVxuXHR9XG5cblx0b3BlbihwYXRoLCBmbGFncywgbW9kZSwgY2FsbGJhY2spXG5cdHtcblxuXHR9XG5cblx0Y2xvc2UoZmQsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdG1rbm9kKHBhdGgsIG1vZGUsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdGFzeW5jIG1rZGlyKHBhdGgsIG1vZGUpXG5cdHtcblx0XHRwYXRoID0gbm9ybWFsaXplKHBhdGgpO1xuXG5cdFx0bGV0IG5hbWUgPSBiYXNlbmFtZShwYXRoKTtcblx0XHRsZXQgcGFyZW50UGF0aCA9IGRpcm5hbWUocGF0aCk7XG5cblx0XHRsZXQgZGlyZWN0b3J5Tm9kZTtcblx0XHR0cnkge1xuXHRcdFx0ZGlyZWN0b3J5Tm9kZSA9IGF3YWl0IHRoaXMuZmluZE5vZGUoeyBwYXRoOiBwYXRoIH0pO1xuXHRcdH0gY2F0Y2goZXJyb3IpIHtcblx0XHRcdGRpcmVjdG9yeU5vZGUgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKGRpcmVjdG9yeU5vZGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKGRpcmVjdG9yeU5vZGUudG9KU09OKCkpO1xuXHRcdFx0dGhyb3cgbmV3IEUuRUVYSVNUKG51bGwsIHBhdGgpO1xuXHRcdH1cblxuXHRcdGxldCBwYXJlbnREaXJlY3RvcnlOb2RlID0gYXdhaXQgdGhpcy5maW5kTm9kZSh7IHBhdGg6IHBhcmVudFBhdGggfSk7XG5cdFx0bGV0IGZzID0gcGFyZW50RGlyZWN0b3J5Tm9kZS5mcztcblxuXHRcdGxldCBwYXJlbnREaXJlY3RvcnlEYXRhXG5cdFx0dHJ5IHtcblx0XHRcdHBhcmVudERpcmVjdG9yeURhdGEgPSBhd2FpdCBwYXJlbnREaXJlY3RvcnlOb2RlLnJlYWREYXRhKCk7XG5cdFx0fSBjYXRjaChlcnJvcikge1xuXHRcdFx0cGFyZW50RGlyZWN0b3J5RGF0YSA9IG5ldyBPYmplY3QoKTtcblx0XHR9XG5cblx0XHRkaXJlY3RvcnlOb2RlID0gbmV3IE5vZGUoeyBmczogZnMsIGRhdGE6IHsgbW9kZTogTU9ERV9ESVJFQ1RPUlksIG5saW5rczogMSwgZGF0YTogVVVJRC5zaG9ydCgpIH0gfSk7XHRcdFxuXHRcdGRpcmVjdG9yeU5vZGUud3JpdGUoKTtcblxuXHRcdGxldCBkaXJlY3RvcnlEYXRhID0gbmV3IE9iamVjdCgpO1xuXHRcdGF3YWl0IGRpcmVjdG9yeU5vZGUud3JpdGVEYXRhKDAsIGRpcmVjdG9yeURhdGEpO1xuXG5cdFx0Ly8gISB1cGRhdGUgbm9kZSBhL2MvbSB0aW1lc1xuXG5cdFx0cGFyZW50RGlyZWN0b3J5RGF0YVtuYW1lXSA9IG5ldyBEaXJlY3RvcnlFbnRyeSh7IGlkOiBkaXJlY3RvcnlOb2RlLmlkLCB0eXBlOiBNT0RFX0RJUkVDVE9SWSB9KTtcdFx0XG5cdFx0YXdhaXQgcGFyZW50RGlyZWN0b3J5Tm9kZS53cml0ZURhdGEoMCwgcGFyZW50RGlyZWN0b3J5RGF0YSk7XG5cblx0XHRwYXJlbnREaXJlY3RvcnlOb2RlLnNpemUgPSBPYmplY3Qua2V5cyhwYXJlbnREaXJlY3RvcnlEYXRhKS5sZW5ndGg7XG5cdFx0YXdhaXQgcGFyZW50RGlyZWN0b3J5Tm9kZS53cml0ZSgpO1xuXHR9XG5cblx0YXN5bmMgcmVhZGRpcihwYXRoKVxuXHR7XG5cdFx0cGF0aENoZWNrKHBhdGgpO1xuXG5cdFx0bGV0IGRpcmVjdG9yeU5vZGUgPSBhd2FpdCB0aGlzLmZpbmROb2RlKHsgcGF0aDogcGF0aCB9KTtcblx0XHRsZXQgZGlyZWN0b3J5RGF0YTtcblx0XHR0cnkge1xuXHRcdFx0ZGlyZWN0b3J5RGF0YSA9IGF3YWl0IGRpcmVjdG9yeU5vZGUucmVhZERhdGEoKTtcblx0XHR9IGNhdGNoKGVycm9yKSB7XG5cdFx0XHRpZihlcnJvciBpbnN0YW5jZW9mIEUuRUlPKVxuXHRcdFx0XHRkaXJlY3RvcnlEYXRhID0gbmV3IE9iamVjdCgpO1xuXHRcdH1cblxuXHRcdGxldCBmaWxlcyA9IE9iamVjdC5rZXlzKGRpcmVjdG9yeURhdGEpO1xuXHRcdHJldHVybiBmaWxlcztcblx0fVxuXG5cdHJtZGlyKHBhdGgsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHN0YXQocGF0aCwgY2FsbGJhY2spXG5cdHtcblxuXHR9XG5cblx0ZnN0YXQoZmQsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdGxpbmsob2xkcGF0aCwgbmV3cGF0aCwgY2FsbGJhY2spXG5cdHtcblxuXHR9XG5cblx0dW5saW5rKHBhdGgsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHJlYWQoZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRyZWFkRmlsZShwYXRoLCBvcHRpb25zLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHR3cml0ZShmZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHdyaXRlRmlsZShwYXRoLCBkYXRhLCBvcHRpb25zLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRhcHBlbmRGaWxlKHBhdGgsIGRhdGEsIG9wdGlvbnMsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdGV4aXN0cyhwYXRoLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRnZXR4YXR0cihwYXRoLCBuYW1lLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRmZ2V0eGF0dHIoZmQsIG5hbWUsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHNldHhhdHRyKHBhdGgsIG5hbWUsIHZhbHVlLCBmbGFnLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRmc2V0eGF0dHIoZmQsIG5hbWUsIHZhbHVlLCBmbGFnLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRyZW1vdmV4YXR0cihwYXRoLCBuYW1lLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRmcmVtb3ZleGF0dHIoZmQsIG5hbWUsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdGxzZWVrKGZkLCBvZmZzZXQsIHdoZW5jZSwgY2FsbGJhY2spXG5cdHtcblxuXHR9XHRcblxuXHR1dGltZXMocGF0aCwgYXRpbWUsIG10aW1lLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRmdXRpbWVzKGZkLCBhdGltZSwgbXRpbWUsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHJlbmFtZShvbGRwYXRoLCBuZXdwYXRoLCBjYWxsYmFjaylcblx0e1xuXG5cdH1cblxuXHRzeW1saW5rKHNyY3BhdGgsIGRzdHBhdGgsIHR5cGUsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHJlYWRsaW5rKHBhdGgsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdGxzdGF0KHBhdGgsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxuXG5cdHRydW5jYXRlKHBhdGgsIGxlbmd0aCwgY2FsbGJhY2spXG5cdHtcblxuXHR9XG5cblx0ZnRydW5jYXRlKGZkLCBsZW5ndGgsIGNhbGxiYWNrKVxuXHR7XG5cblx0fVxufTtcblxuY2xhc3MgVkZTXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdF9fLnNldCh0aGlzLCB7XG5cdFx0XHR2ZnM6IG5ldyBJbnRlcm5hbFZGUygpLFxuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgbW91bnQoLi4uYXJncykgeyByZXR1cm4gYXdhaXQgX18uZ2V0KHRoaXMpLnZmcy5tb3VudCguLi5hcmdzKTsgfVxuXG5cdGFzeW5jIHVtb3VudCguLi5hcmdzKSB7IHJldHVybiBhd2FpdCBfXy5nZXQodGhpcykudmZzLnVtb3VudCguLi5hcmdzKTsgfVxuXG5cdGFzeW5jIG1rZGlyKC4uLmFyZ3MpIHsgcmV0dXJuIGF3YWl0IF9fLmdldCh0aGlzKS52ZnMubWtkaXIoLi4uYXJncyk7IH1cblxuXHRhc3luYyByZWFkZGlyKC4uLmFyZ3MpIHsgcmV0dXJuIGF3YWl0IF9fLmdldCh0aGlzKS52ZnMucmVhZGRpciguLi5hcmdzKTsgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBWRlM7IiwiaW1wb3J0IEZTIGZyb20gXCIuL2ZzL2luZGV4XCI7XG5pbXBvcnQgVkZTIGZyb20gXCIuL3Zmcy9pbmRleFwiO1xuaW1wb3J0IFByb3ZpZGVycyBmcm9tIFwiLi9mcy9wcm92aWRlcnMvaW5kZXhcIjtcbmltcG9ydCBVVUlEIGZyb20gXCIuL2NvbW1vbi91dWlkXCI7XG5pbXBvcnQgRmlsZXJCdWZmZXIgZnJvbSBcIi4vY29tbW9uL2J1ZmZlclwiO1xuaW1wb3J0IENyeXB0byBmcm9tIFwiLi9jb21tb24vY3J5cHRvXCI7XG5pbXBvcnQgVVJMIGZyb20gXCIuL2NvbW1vbi91cmxcIjtcblxuZXhwb3J0IGRlZmF1bHQgeyBcblx0RlM6IEZTLFxuXHRWRlM6IFZGUyxcblx0VVVJRDogVVVJRCxcblx0QnVmZmVyOiBGaWxlckJ1ZmZlcixcblx0Q3J5cHRvOiBDcnlwdG8sXG59OyJdLCJuYW1lcyI6WyJFIiwiQ3J5cHRvIiwiX18iLCJwYXRoQ2hlY2siLCJGaWxlckJ1ZmZlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0NBQUEsTUFBTSxRQUFRO0NBQ2Q7Q0FDQSxDQUFDLE9BQU8saUJBQWlCO0NBQ3pCLENBQUM7Q0FDRCxFQUFFLFFBQVEsV0FBVyxLQUFLLE9BQU8sTUFBTTtDQUN2QyxJQUFJLFdBQVcsS0FBSyxPQUFPLE1BQU0sQ0FBQyxNQUFNO0NBQ3hDLElBQUksVUFBVSxLQUFLLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUU7Q0FDekQsRUFBRTs7Q0FFRixDQUFDLE9BQU8sa0JBQWtCO0NBQzFCLENBQUM7Q0FDRCxFQUFFLEdBQUcsV0FBVyxLQUFLLE9BQU8sT0FBTyxFQUFFO0NBQ3JDLEdBQUcsSUFBSTtDQUNQLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztDQUM5QixJQUFJLE9BQU8sSUFBSSxDQUFDO0NBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtDQUNkLElBQUk7Q0FDSixHQUFHOztDQUVILEVBQUUsT0FBTyxLQUFLLENBQUM7Q0FDZixFQUFFO0NBQ0YsQ0FBQzs7Q0NyQkQsTUFBTSxVQUFV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QUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRTs7Q0FFdEMsQ0FBQyxJQUFJLElBQUksR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFOztDQUV4QyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7Q0FDMUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUU7O0NBRXZELENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRTtDQUMxQyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRTs7Q0FFdkQsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFO0NBQzFDLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxFQUFFOztDQUV2RCxDQUFDLElBQUksT0FBTyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUU7Q0FDOUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRyxLQUFLLEVBQUU7O0NBRTNELENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRTtDQUMxQyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRTs7Q0FFdkQsQ0FBQyxNQUFNO0NBQ1AsQ0FBQztDQUNELEVBQUUsT0FBTztDQUNULEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO0NBQ2hCLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0NBQ2xCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO0NBQ3hCLEdBQUcsQ0FBQztDQUNKLEVBQUU7Q0FDRixDQUFDOztDQUVELE1BQU0sU0FBUztDQUNmO0NBQ0EsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtDQUM5QixDQUFDO0NBQ0QsRUFBRUEsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7Q0FDZixHQUFHLEVBQUUsRUFBRSxFQUFFO0NBQ1QsR0FBRyxFQUFFLEVBQUUsYUFBYTs7Q0FFcEIsR0FBRyxJQUFJLEVBQUUsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDO0NBQ2hDLEdBQUcsQ0FBQyxDQUFDO0NBQ0wsRUFBRTs7Q0FFRixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUU7O0NBRXBDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRTs7Q0FFcEMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTs7Q0FFM0MsQ0FBQyxJQUFJLElBQUksR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTs7Q0FFN0MsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtDQUMvQyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUU7O0NBRTVELENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7Q0FDL0MsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxFQUFFOztDQUU1RCxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0NBQy9DLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRTs7Q0FFNUQsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFD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RUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRTs7Q0FFdkQsQ0FBQyxJQUFJLE9BQU8sR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFO0NBQzlDLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxFQUFFOztDQUUzRCxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7Q0FDMUM7Q0FDQSxDQUFDLElBQUksTUFBTSxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7O0NBRTVDLENBQUMsSUFBSSxNQUFNLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRTtDQUM1QyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUssRUFBRTs7Q0FFekQsQ0FBQyxJQUFJLE9BQU8sR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFO0NBQzlDO0NBQ0EsQ0FBQyxJQUFJLE9BQU8sR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFO0NBQzlDLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxFQUFFOztDQUUzRCxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7Q0FDMUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUU7O0NBRXZELENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRTtDQUN4QyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssRUFBRTs7Q0FFckQsQ0FBQyxNQUFNO0NBQ1AsQ0FBQztDQUNELEVBQUUsT0FBTztDQUNULEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0NBQ2xCLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0NBQ2xCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO0NBQ3RCLEdBQUcsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO0NBQ3hCLEdBQUcsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO0NBQ3hCLEdBQUcsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO0NBQ3hCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0NBQ3BCLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO0NBQ3RCLEdBQUcsQ0FBQztDQUNKLEVBQUU7Q0FDRixDQUFDOztDQUVELE1BQU0sSUFBSTtDQUNWO0NBQ0EsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO0NBQ2pELENBQUM7Q0FDRCxFQUFFQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtDQUNmLEdBQUcsRUFBRSxFQUFFLEVBQUU7Q0FDVCxHQUFHLEVBQUUsRUFBRSxFQUFFOztDQUVULEdBQUcsSUFBSSxFQUFFLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQztDQUMzQixHQUFHLENBQUMsQ0FBQztDQUNMLEVBQUU7O0NBRUYsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFOztDQUVwQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUU7Q0FDcEM7Q0FDQSxDQUFDLElBQUksSUFBSSxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0NBQzdDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssRUFBRTs7Q0FFMUQsQ0FBQyxJQUFJLE1BQU0sR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtDQUNqRCxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLEVBQUU7O0NBRTlELENBQUMsSUFBSSxPQUFPLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7Q0FDbkQsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxFQUFFOztDQUVoRSxDQUFDLElBQUksT0FBTyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFOztDQUVuRCxDQUFDLElBQUksT0FBTyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO0NBQ25ELENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssRUFBRTs7Q0FFaEUsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtDQUMvQyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUU7O0NBRTVELENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7Q0FDL0MsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxFQUFFOztDQUU1RCxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FB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QyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxLQUFLLEVBQUU7O0NBRTdELENBQUMsSUFBSSxRQUFRLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtDQUNoRCxDQUFDLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxHQUFHLEtBQUssRUFBRTs7Q0FFN0QsQ0FBQyxJQUFJLElBQUksR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFO0NBQ3hDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxFQUFFOztDQUVyRCxDQUFDLElBQUksSUFBSSxHQUFHLEVBQUUsT0FBT0EsSUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUU7Q0FDeEMsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLEVBQUU7O0NBRXJELENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxPQUFPQSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRTtDQUN4QyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssRUFBRTs7Q0FFckQsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLE9BQU9BLElBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFF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QUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7Q0FDNUQsRUFBRSxJQUFJLFNBQVMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7Q0FDbkQsRUFBRSxJQUFJLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDOztDQUVwRCxFQUFFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0NBQ3JHLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDOztDQUVyQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtDQUM3QyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7Q0FDdEQsR0FBRztDQUNILEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0NBQzFELEVBQUU7O0NBRUYsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxJQUFJO0NBQ2xCLENBQUM7Q0FDRCxFQUFFLE1BQU0sSUFBSSxHQUFHRSxJQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDOztDQUU1QixFQUFFLElBQUksVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElB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
