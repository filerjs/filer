import RootFS from "./root-fs";
import MemFS from "./mem-fs";

export default {
	[RootFS.type]: RootFS,
	[MemFS.type]: MemFS,
};