const INSPECT_MAX_BYTES = 50;
const K_MAX_LENGTH = 0x7fffffff;

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
		    var arr = new Uint8Array(1)
		    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
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

export default Buffer;