/**
 * Provide guarantees about Buffer vs. Uint8Array for internal code
 * that has a preference.
 *
 * From the node.js Buffer docs: http://nodejs.org/api/buffer.html#buffer_buffer
 *
 * "A Buffer object can also be used with typed arrays. The buffer
 * object is cloned to an ArrayBuffer that is used as the backing
 * store for the typed array. The memory of the buffer and the
 * ArrayBuffer is not shared."
 *
 * In a browser, where we use https://github.com/feross/buffer, a Buffer
 * is really a Uint8Array augmented with other methods and properties. As
 * such, we do feature detection instead of type identifiation.
 */

function ensureBuffer(maybeBuffer) {
  if(!(typeof maybeBuffer.copy === 'function')) {
    maybeBuffer = new Buffer(maybeBuffer);
  }
  return maybeBuffer;
}

function ensureUint8Array(maybeU8) {
  if(!('buffer' in maybeU8 && 'byteOffset' in maybeU8 && 'byteLength' in maybeU8)) {
    maybeU8 = new Uint8Array(maybeU8);
  }
  return maybeU8;
}

module.exports = {
  ensureBuffer: ensureBuffer,
  ensureUint8Array: ensureUint8Array
};
