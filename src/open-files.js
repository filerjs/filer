const { FIRST_DESCRIPTOR } = require('./constants');
const openFiles = {};

/**
 * Start at FIRST_DESCRIPTOR and go until we find
 * an empty file descriptor, then return it.
 */
const getEmptyDescriptor = () => {
  let fd = FIRST_DESCRIPTOR;

  while(getOpenFileDescription(fd)) {
    fd++;
  }

  return fd;
};

/**
 * Look up the open file description object for a given
 * file descriptor.
 */
const getOpenFileDescription = ofd => openFiles[ofd];

/**
 * Allocate a new file descriptor for the given
 * open file description. 
 */
const allocDescriptor = openFileDescription => {
  const ofd = getEmptyDescriptor();
  openFiles[ofd] = openFileDescription;
  return ofd;
};

/**
 * Release the given existing file descriptor created
 * with allocDescriptor(). 
 */
const releaseDescriptor = ofd => delete openFiles[ofd];

module.exports = {
  allocDescriptor,
  releaseDescriptor,
  getOpenFileDescription
};
