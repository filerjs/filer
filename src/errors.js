/*
Copyright (c) 2012, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Errors based off Node.js custom errors (https://github.com/rvagg/node-errno) made available under the MIT license 
*/

define(function(require) {
  // 'use strict';
  
  function Unknown(message){
    this.message = message || 'unknown error';
  }
  Unknown.prototype = new Error();
  Unknown.prototype.errno = -1;
  Unknown.prototype.code = "UNKNOWN";
  Unknown.prototype.constructor = Unknown;

  function OK(message){
    this.message = message || 'success';
  }
  OK.prototype = new Error();
  OK.prototype.errno = 0;
  OK.prototype.code = "OK";
  OK.prototype.constructor = OK;

  function EOF(message){
    this.message = message || 'end of file';
  }
  EOF.prototype = new Error();
  EOF.prototype.errno = 1;
  EOF.prototype.code = "EOF";
  EOF.prototype.constructor = EOF;
    
  function EAddrInfo(message){
    this.message = message || 'getaddrinfo error';
  }
  EAddrInfo.prototype = new Error();
  EAddrInfo.prototype.errno = 2;
  EAddrInfo.prototype.code = "EADDRINFO";
  EAddrInfo.prototype.constructor = EAddrInfo;
    
  function EAcces(message){
    this.message = message || 'permission denied';
  }
  EAcces.prototype = new Error();
  EAcces.prototype.errno = 3;
  EAcces.prototype.code = "EACCES";
  EAcces.prototype.constructor = EAcces;
    
  function EAgain(message){
    this.message = message || 'resource temporarily unavailable';
  }
  EAgain.prototype = new Error();
  EAgain.prototype.errno = 4;
  EAgain.prototype.code = "EAGAIN";
  EAgain.prototype.constructor = EAgain;
    
  function EAddrInUse(message){
    this.message = message || 'address already in use';
  }
  EAddrInUse.prototype = new Error();
  EAddrInUse.prototype.errno = 5;
  EAddrInUse.prototype.code = "EADDRINUSE";
  EAddrInUse.prototype.constructor = EAddrInUse;
    
  function EAddrNotAvail(message){
    this.message = message || 'address not available';
  }
  EAddrNotAvail.prototype = new Error();
  EAddrNotAvail.prototype.errno = 6;
  EAddrNotAvail.prototype.code = "EADDRNOTAVAIL";
  EAddrNotAvail.prototype.constructor = EAddrNotAvail;
    
  function EAFNoSupport(message){
    this.message = message || 'address family not supported';
  }
  EAFNoSupport.prototype = new Error();
  EAFNoSupport.prototype.errno = 7;
  EAFNoSupport.prototype.code = "EAFNOSUPPORT";
  EAFNoSupport.prototype.constructor = EAFNoSupport;

  function EAlready(message){
    this.message = message || 'connection already in progress';
  }
  EAlready.prototype = new Error();
  EAlready.prototype.errno = 8;
  EAlready.prototype.code = "EALREADY";
  EAlready.prototype.constructor = EAlready;

  function EBadFileDescriptor(message){
    this.message = message || 'bad file descriptor';
  }
  EBadFileDescriptor.prototype = new Error();
  EBadFileDescriptor.prototype.errno = 9;
  EBadFileDescriptor.prototype.code = "EBADF";
  EBadFileDescriptor.prototype.constructor = EBadFileDescriptor;

  function EBusy(message){
    this.message = message || 'resource busy or locked';
  }
  EBusy.prototype = new Error();
  EBusy.prototype.errno = 10;
  EBusy.prototype.code = "EBUSY";
  EBusy.prototype.constructor = EBusy;

  function EConnAborted(message){
    this.message = message || 'software caused connection abort';
  }
  EConnAborted.prototype = new Error();
  EConnAborted.prototype.errno = 11;
  EConnAborted.prototype.code = "ECONNABORTED";
  EConnAborted.prototype.constructor = EConnAborted;

  function EConnRefused(message){
    this.message = message || 'connection refused';
  }
  EConnRefused.prototype = new Error();
  EConnRefused.prototype.errno = 12;
  EConnRefused.prototype.code = "ECONNREFUSED";
  EConnRefused.prototype.constructor = EConnRefused;

  function EConnReset(message){
    this.message = message || 'connection reset by peer';
  }
  EConnReset.prototype = new Error();
  EConnReset.prototype.errno = 13;
  EConnReset.prototype.code = "ECONNRESET";
  EConnReset.prototype.constructor = EConnReset;

  function EDestAddrReq(message){
    this.message = message || 'destination address required';
  }
  EDestAddrReq.prototype = new Error();
  EDestAddrReq.prototype.errno = 14;
  EDestAddrReq.prototype.code = "EDESTADDRREQ";
  EDestAddrReq.prototype.constructor = EDestAddrReq;

  function EFault(message){
    this.message = message || 'bad address in system call argument';
  }
  EFault.prototype = new Error();
  EFault.prototype.errno = 15;
  EFault.prototype.code = "EFAULT";
  EFault.prototype.constructor = EFault;

  function EHostUnreach(message){
    this.message = message || 'host is unreachable';
  }
  EHostUnreach.prototype = new Error();
  EHostUnreach.prototype.errno = 16;
  EHostUnreach.prototype.code = "EHOSTUNREACH";
  EHostUnreach.prototype.constructor = EHostUnreach;

  function EIntr(message){
    this.message = message || 'interrupted system call';
  }
  EIntr.prototype = new Error();
  EIntr.prototype.errno = 17;
  EIntr.prototype.code = "EINTR";
  EIntr.prototype.constructor = EIntr;
  
  function EInvalid(message){
    this.message = message || 'invalid argument';
  }
  EInvalid.prototype = new Error();
  EInvalid.prototype.errno = 18;
  EInvalid.prototype.code = "EINVAL";
  EInvalid.prototype.constructor = EInvalid;

  function EIsConn(message){
    this.message = message || 'socket is already connected';
  }
  EIsConn.prototype = new Error();
  EIsConn.prototype.errno = 19;
  EIsConn.prototype.code = "EISCONN";
  EIsConn.prototype.constructor = EIsConn;

  function EMFile(message){
    this.message = message || 'too many open files';
  }
  EMFile.prototype = new Error();
  EMFile.prototype.errno = 20;
  EMFile.prototype.code = "EMFILE";
  EMFile.prototype.constructor = EMFile;

  function EMsgSize(message){
    this.message = message || 'message too long';
  }
  EMsgSize.prototype = new Error();
  EMsgSize.prototype.errno = 21;
  EMsgSize.prototype.code = "EMSGSIZE";
  EMsgSize.prototype.constructor = EMsgSize;

  function ENetDown(message){
    this.message = message || 'network is down';
  }
  ENetDown.prototype = new Error();
  ENetDown.prototype.errno = 22;
  ENetDown.prototype.code = "ENETDOWN";
  ENetDown.prototype.constructor = ENetDown;

  function ENetUnreach(message){
    this.message = message || 'network is unreachable';
  }
  ENetUnreach.prototype = new Error();
  ENetUnreach.prototype.errno = 23;
  ENetUnreach.prototype.code = "ENETUNREACH";
  ENetUnreach.prototype.constructor = ENetUnreach;

  function ENFile(message){
    this.message = message || 'file table overflow';
  }
  ENFile.prototype = new Error();
  ENFile.prototype.errno = 24;
  ENFile.prototype.code = "ENFILE";
  ENFile.prototype.constructor = ENFile;

  function ENoBufS(message){
    this.message = message || 'no buffer space available';
  }
  ENoBufS.prototype = new Error();
  ENoBufS.prototype.errno = 25;
  ENoBufS.prototype.code = "ENOBUFS";
  ENoBufS.prototype.constructor = ENoBufS;

  function ENoMem(message){
    this.message = message || 'not enough memory';
  }
  ENoMem.prototype = new Error();
  ENoMem.prototype.errno = 26;
  ENoMem.prototype.code = "ENOMEM";
  ENoMem.prototype.constructor = ENoMem;

  function ENotDirectory(message){
    this.message = message || 'not a directory';
  }
  ENotDirectory.prototype = new Error();
  ENotDirectory.prototype.errno = 27;
  ENotDirectory.prototype.code = "ENOTDIR";
  ENotDirectory.prototype.constructor = ENotDirectory;

  function EIsDirectory(message){
    this.message = message || 'illegal operation on a directory';
  }
  EIsDirectory.prototype = new Error();
  EIsDirectory.prototype.errno = 28;
  EIsDirectory.prototype.code = "EISDIR";
  EIsDirectory.prototype.constructor = EIsDirectory;

  function ENoNet(message){
    this.message = message || 'machine is not on the network';
  }
  ENoNet.prototype = new Error();
  ENoNet.prototype.errno = 29;
  ENoNet.prototype.code = "ENONET";
  ENoNet.prototype.constructor = ENoNet;

  function ENotConn(message){
    this.message = message || 'socket is not connected';
  }
  ENotConn.prototype = new Error();
  ENotConn.prototype.errno = 31;
  ENotConn.prototype.code = "ENOTCONN";
  ENotConn.prototype.constructor = ENotConn;

  function ENotSock(message){
    this.message = message || 'socket operation on non-socket';
  }
  ENotSock.prototype = new Error();
  ENotSock.prototype.errno = 32;
  ENotSock.prototype.code = "ENOTSOCK";
  ENotSock.prototype.constructor = ENotSock;

  function ENotSup(message){
    this.message = message || 'operation not supported on socket';
  }
  ENotSup.prototype = new Error();
  ENotSup.prototype.errno = 33;
  ENotSup.prototype.code = "ENOTSUP";
  ENotSup.prototype.constructor = ENotSup;

  function ENoEntry(message){
    this.message = message || 'no such file or directory';
  }
  ENoEntry.prototype = new Error();
  ENoEntry.prototype.errno = 34;
  ENoEntry.prototype.code = "ENOENT";
  ENoEntry.prototype.constructor = ENoEntry;

  function ENotImplemented(message){
    this.message = message || 'function not implemented';
  }
  ENotImplemented.prototype = new Error();
  ENotImplemented.prototype.errno = 35;
  ENotImplemented.prototype.code = "ENOSYS";
  ENotImplemented.prototype.constructor = ENotImplemented;

  function EPipe(message){
    this.message = message || 'broken pipe';
  }
  EPipe.prototype = new Error();
  EPipe.prototype.errno = 36;
  EPipe.prototype.code = "EPIPE";
  EPipe.prototype.constructor = EPipe;

  function EProto(message){
    this.message = message || 'protocol error';
  }
  EProto.prototype = new Error();
  EProto.prototype.errno = 37;
  EProto.prototype.code = "EPROTO";
  EProto.prototype.constructor = EProto;

  function EProtoNoSupport(message){
    this.message = message || 'protocol not supported';
  }
  EProtoNoSupport.prototype = new Error();
  EProtoNoSupport.prototype.errno = 38;
  EProtoNoSupport.prototype.code = "EPROTONOSUPPORT";
  EProtoNoSupport.prototype.constructor = EProtoNoSupport;

  function EPrototype(message){
    this.message = message || 'protocol wrong type for socket';
  }
  EPrototype.prototype = new Error();
  EPrototype.prototype.errno = 39;
  EPrototype.prototype.code = "EPROTOTYPE";
  EPrototype.prototype.constructor = EPrototype;

  function ETimedOut(message){
    this.message = message || 'connection timed out';
  }
  ETimedOut.prototype = new Error();
  ETimedOut.prototype.errno = 40;
  ETimedOut.prototype.code = "ETIMEDOUT";
  ETimedOut.prototype.constructor = ETimedOut;

  function ECharset(message){
    this.message = message || 'invalid Unicode character';
  }
  ECharset.prototype = new Error();
  ECharset.prototype.errno = 41;
  ECharset.prototype.code = "ECHARSET";
  ECharset.prototype.constructor = ECharset;

  function EAIFamNoSupport(message){
    this.message = message || 'address family for hostname not supported';
  }
  EAIFamNoSupport.prototype = new Error();
  EAIFamNoSupport.prototype.errno = 42;
  EAIFamNoSupport.prototype.code = "EAIFAMNOSUPPORT";
  EAIFamNoSupport.prototype.constructor = EAIFamNoSupport;

  function EAIService(message){
    this.message = message || 'servname not supported for ai_socktype';
  }
  EAIService.prototype = new Error();
  EAIService.prototype.errno = 44;
  EAIService.prototype.code = "EAISERVICE";
  EAIService.prototype.constructor = EAIService;

  function EAISockType(message){
    this.message = message || 'ai_socktype not supported';
  }
  EAISockType.prototype = new Error();
  EAISockType.prototype.errno = 45;
  EAISockType.prototype.code = "EAISOCKTYPE";
  EAISockType.prototype.constructor = EAISockType;

  function EShutdown(message){
    this.message = message || 'cannot send after transport endpoint shutdown';
  }
  EShutdown.prototype = new Error();
  EShutdown.prototype.errno = 46;
  EShutdown.prototype.code = "ESHUTDOWN";
  EShutdown.prototype.constructor = EShutdown;

  function EExists(message){
    this.message = message || 'file already exists';
  }
  EExists.prototype = new Error();
  EExists.prototype.errno = 47;
  EExists.prototype.code = "EEXIST";
  EExists.prototype.constructor = EExists;
  
  function ESrch(message){
    this.message = message || 'no such process';
  }
  ESrch.prototype = new Error();
  ESrch.prototype.errno = 48;
  ESrch.prototype.code = "ESRCH";
  ESrch.prototype.constructor = ESrch;

  function ENameTooLong(message){
    this.message = message || 'name too long';
  }
  ENameTooLong.prototype = new Error();
  ENameTooLong.prototype.errno = 49;
  ENameTooLong.prototype.code = "ENAMETOOLONG";
  ENameTooLong.prototype.constructor = ENameTooLong;

  function EPerm(message){
    this.message = message || 'operation not permitted';
  }
  EPerm.prototype = new Error();
  EPerm.prototype.errno = 50;
  EPerm.prototype.code = "EPERM";
  EPerm.prototype.constructor = EPerm;

  function ELoop(message){
    this.message = message || 'too many symbolic links encountered';
  }
  ELoop.prototype = new Error();
  ELoop.prototype.errno = 51;
  ELoop.prototype.code = "ELOOP";
  ELoop.prototype.constructor = ELoop;

  function EXDev(message){
    this.message = message || 'cross-device link not permitted';
  }
  EXDev.prototype = new Error();
  EXDev.prototype.errno = 52;
  EXDev.prototype.code = "EXDEV";
  EXDev.prototype.constructor = EXDev;

  function ENotEmpty(message){
    this.message = message || 'directory not empty';
  }
  ENotEmpty.prototype = new Error();
  ENotEmpty.prototype.errno = 53;
  ENotEmpty.prototype.code = "ENOTEMPTY";
  ENotEmpty.prototype.constructor = ENotEmpty;

  function ENoSpc(message){
    this.message = message || 'no space left on device';
  }
  ENoSpc.prototype = new Error();
  ENoSpc.prototype.errno = 54;
  ENoSpc.prototype.code = "ENOSPC";
  ENoSpc.prototype.constructor = ENoSpc;

  function EIO(message){
    this.message = message || 'i/o error';
  }
  EIO.prototype = new Error();
  EIO.prototype.errno = 55;
  EIO.prototype.code = "EIO";
  EIO.prototype.constructor = EIO;

  function EROFS(message){
    this.message = message || 'read-only file system';
  }
  EROFS.prototype = new Error();
  EROFS.prototype.errno = 56;
  EROFS.prototype.code = "EROFS";
  EROFS.prototype.constructor = EROFS;

  function ENoDev(message){
    this.message = message || 'no such device';
  }
  ENoDev.prototype = new Error();
  ENoDev.prototype.errno = 57;
  ENoDev.prototype.code = "ENODEV";
  ENoDev.prototype.constructor = ENoDev;

  function ESPipe(message){
    this.message = message || 'invalid seek';
  }
  ESPipe.prototype = new Error();
  ESPipe.prototype.errno = 58;
  ESPipe.prototype.code = "ESPIPE";
  ESPipe.prototype.constructor = ESPipe;

  function ECanceled(message){
    this.message = message || 'operation canceled';
  }
  ECanceled.prototype = new Error();
  ECanceled.prototype.errno = 59;
  ECanceled.prototype.code = "ECANCELED";
  ECanceled.prototype.constructor = ECanceled;

  function ENotMounted(message){
    this.message = message || 'not mounted';
  }
  ENotMounted.prototype = new Error();
  ENotMounted.prototype.errno = 60;
  ENotMounted.prototype.code = "ENotMounted";
  ENotMounted.prototype.constructor = ENotMounted;

  function EFileSystemError(message){
    this.message = message || 'missing super node';
  }
  EFileSystemError.prototype = new Error();
  EFileSystemError.prototype.errno = 61;
  EFileSystemError.prototype.code = "EFileSystemError";
  EFileSystemError.prototype.constructor = EFileSystemError;

  function ENoAttr(message) {
    this.message = message || 'attribute does not exist';
  }
  ENoAttr.prototype = new Error();
  ENoAttr.prototype.errno = 62;
  ENoAttr.prototype.code = 'ENoAttr';
  ENoAttr.prototype.constructor = ENoAttr;

  return {
    Unknown: Unknown,
    OK: OK,
    EOF: EOF,
    EAddrInfo: EAddrInfo,
    EAcces: EAcces,
    EAgain: EAgain,
    EAddrInUse: EAddrInUse,
    EAddrNotAvail: EAddrNotAvail,
    EAFNoSupport: EAFNoSupport,
    EAlready: EAlready,
    EBadFileDescriptor: EBadFileDescriptor,
    EBusy: EBusy,
    EConnAborted: EConnAborted,
    EConnRefused: EConnRefused,
    EConnReset: EConnReset,
    EDestAddrReq: EDestAddrReq,
    EFault: EFault,
    EHostUnreach: EHostUnreach,
    EIntr: EIntr,
    EInvalid: EInvalid,
    EIsConn: EIsConn,
    EMFile: EMFile,
    EMsgSize: EMsgSize,
    ENetDown: ENetDown,
    ENetUnreach: ENetUnreach,
    ENFile: ENFile,
    ENoBufS: ENoBufS,
    ENoMem: ENoMem,
    ENotDirectory: ENotDirectory,
    EIsDirectory: EIsDirectory,
    ENoNet: ENoNet,
    ENotConn: ENotConn,
    ENotSock: ENotSock,
    ENotSup: ENotSup,
    ENoEntry: ENoEntry,
    ENotImplemented: ENotImplemented,
    EPipe: EPipe,
    EProto: EProto,
    EProtoNoSupport: EProtoNoSupport,
    EPrototype: EPrototype,
    ETimedOut: ETimedOut,
    ECharset: ECharset,
    EAIFamNoSupport: EAIFamNoSupport,
    EAIService: EAIService,
    EAISockType: EAISockType,
    EShutdown: EShutdown,
    EExists: EExists,
    ESrch: ESrch,
    ENameTooLong: ENameTooLong,
    EPerm: EPerm,
    ELoop: ELoop,
    EXDev: EXDev,
    ENotEmpty: ENotEmpty,
    ENoSpc: ENoSpc,
    EIO: EIO,
    EROFS: EROFS,
    ENoDev: ENoDev,
    ESPipe: ESPipe,
    ECanceled: ECanceled,
    ENotMounted: ENotMounted,
    EFileSystemError: EFileSystemError,
    ENoAttr: ENoAttr
  };

});
