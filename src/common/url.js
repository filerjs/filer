const __ = new WeakMap();

const URL_REGEX = /^((\w+)\+(\w+):)?(\/\/((\w+)?(:(\w+))?@)?([^\/\?:]+)(:(\d+))?)?(\/?([^\/\?#][^\?#]*)?)?(\?([^#]+))?(#(\w*))?/i;

class URL
{
	constructor(urlString)
	{
		__.set(this, {

		});
		const self = __.get(this);

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

	get protocol() { return __.get(this).protocol }
	set protocol(value) { return __.get(this).protocol = value }

	get subprotocol() { return __.get(this).subprotocol }
	set subprotocol(value) { return __.get(this).subprotocol = value }

	get username() { return __.get(this).username }
	set username(value) { return __.get(this).username = value }

	get password() { return __.get(this).password }
	set password(value) { return __.get(this).password = value }

	get host() { return __.get(this).host }
	set host(value) { return __.get(this).host = value }

	get port() { return __.get(this).port }
	set port(value) { return __.get(this).port = value }

	get path() { return __.get(this).path }
	set path(value) { return __.get(this).path = value }

	get query() { return __.get(this).query }
	set query(value) { return __.get(this).query = value }

	get fragment() { return __.get(this).fragment }
	set fragment(value) { return __.get(this).fragment = value }

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

export default URL;