import Buffer from "./buffer";

export const SUPER_NODE_ID = "0000000000000000000000";

export const MODE_FILE = "FILE";
export const MODE_DIRECTORY = "DIRECTORY";
export const MODE_SYMBOLIC_LINK = "MODE_SYMBOLIC_LINK";
export const MODE_META = "META";
export const MODE_SOCKET = "SOCKET";
export const MODE_FIFO = "FIFO";
export const MODE_CHARACTER_DEVICE = "CHARACTER_DEVICE";
export const MODE_BLOCK_DEVICE = "BLOCK_DEVICE";

export const ROOT_DIRECTORY_NAME = "/"; // basename(normalize(path))

export const STDIN = 0;
export const STDOUT = 1;
export const STDERR = 2;

export const FIRST_DESCRIPTOR = 3;

export const N_VFS_DESCRIPTORS = 1024;

export const DATA_BLOCK_SEPARATOR = "#";

export const MNT_READ_ONLY = "READ_ONLY";

export const SYMLOOP_MAX = 10;