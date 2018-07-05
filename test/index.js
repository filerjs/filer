const Filer = require("../dist/filer.js");
const should = require("should");

describe("Filer", () => {
	it("should be an object", async () => {
		(Filer).should.be.an.Object();
	});
});

describe("Filer.VFS", () => {
	it("should be a constructor", async () => {
		(Filer.VFS).should.be.a.Function();
		let vfs = new Filer.VFS();		
	});

	it("should create a basic root file system on construction", async () => {
		let vfs = new Filer.VFS();
		let rootDirectoryEntries = await vfs.readdir("/");

		(rootDirectoryEntries).should.deepEqual([]);
	});
});