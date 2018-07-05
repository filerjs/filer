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

export default Platform;