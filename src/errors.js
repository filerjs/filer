define(function(require) {
  var errors = {};
  var errno = -1;

  /**
   * DON'T CHANGE THE ORDER OF THIS ARRAY!!
   * The errno property follows the order from -1 upward
   */
  [
    /**
     * node.js errors
     */
    'UNKNOWN:unknown error',
    'OK:success',
    'EOF:end of file',
    'EADDRINFO:getaddrinfo error',
    'EACCES:permission denied',
    'EAGAIN:resource temporarily unavailable',
    'EADDRINUSE:address already in use',
    'EADDRNOTAVAIL:address not available',
    'EAFNOSUPPORT:address family not supported',
    'EALREADY:connection already in progress',
    'EBADF:bad file descriptor',
    'EBUSY:resource busy or locked',
    'ECONNABORTED:software caused connection abort',
    'ECONNREFUSED:connection refused',
    'ECONNRESET:connection reset by peer',
    'EDESTADDRREQ:destination address required',
    'EFAULT:bad address in system call argument',
    'EHOSTUNREACH:host is unreachable',
    'EINTR:interrupted system call',
    'EINVAL:invalid argument',
    'EISCONN:socket is already connected',
    'EMFILE:too many open files',
    'EMSGSIZE:message too long',
    'ENETDOWN:network is down',
    'ENETUNREACH:network is unreachable',
    'ENFILE:file table overflow',
    'ENOBUFS:no buffer space available',
    'ENOMEM:not enough memory',
    'ENOTDIR:not a directory',
    'EISDIR:illegal operation on a directory',
    'ENONET:machine is not on the network',
    'ENOTCONN:socket is not connected',
    'ENOTSOCK:socket operation on non-socket',
    'ENOTSUP:operation not supported on socket',
    'ENOENT:no such file or directory',
    'ENOSYS:function not implemented',
    'EPIPE:broken pipe',
    'EPROTO:protocol error',
    'EPROTONOSUPPORT:protocol not supported',
    'EPROTOTYPE:protocol wrong type for socket',
    'ETIMEDOUT:connection timed out',
    'ECHARSET:invalid Unicode character',
    'EAIFAMNOSUPPORT:address family for hostname not supported',
    'EAISERVICE:servname not supported for ai_socktype',
    'EAISOCKTYPE:ai_socktype not supported',
    'ESHUTDOWN:cannot send after transport endpoint shutdown',
    'EEXIST:file already exists',
    'ESRCH:no such process',
    'ENAMETOOLONG:name too long',
    'EPERM:operation not permitted',
    'ELOOP:too many symbolic links encountered',
    'EXDEV:cross-device link not permitted',
    'ENOTEMPTY:directory not empty',
    'ENOSPC:no space left on device',
    'EIO:i/o error',
    'EROFS:read-only file system',
    'ENODEV:no such device',
    'ESPIPE:invalid seek',
    'ECANCELED:operation canceled',

    /**
     * Filer specific errors
     */
    'ENOTMOUNTED:not mounted',
    'EFILESYSTEMERROR:missing super node',
    'ENOATTR:attribute does not exist'

  ].forEach(function(e) {
    e = e.split(':');
    var err = e[0];
    var message = e[1];

    function ctor(m) {
      this.message = m || message;
    }
    var proto = ctor.prototype = new Error();
    proto.errno = errno;
    proto.code = err;
    proto.constructor = ctor;

    // We expose the error as both Errors.EINVAL and Errors[18]
    errors[err] = errors[errno] = ctor;

    errno++;
  });

  return errors;
});
