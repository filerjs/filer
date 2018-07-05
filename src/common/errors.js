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
]

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
	}
}

export default errors;