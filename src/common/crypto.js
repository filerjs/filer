import Platform from "./platform";
import E from "./errors";

let Crypto;
if(Platform.supportsWebCrypto()) {
	Crypto = class Crypto
	{
		static randomBytes(arrayBuffer)
		{
			return window.crypto.getRandomValues(arrayBuffer);
		}
	}
} else if(Platform.supportsNodeCrypto()) {
	let nodeCrypto = require("crypto");
	Crypto = class Crypto
	{
		static randomBytes(arrayBuffer)
		{
			return nodeCrypto.randomFillSync(arrayBuffer);
		}
	}
} else {
	throw new E.ENOTSUPPORTED("crypto support is not available on this platform");
}

export default Crypto;