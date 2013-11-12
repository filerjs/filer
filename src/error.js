/*
Copyright (c) 2012, Alan Kligman
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

define(function(require) {
  // 'use strict';

  function EExists(message){
    this.message = message || '';
  }
  EExists.prototype = new Error();
  EExists.prototype.name = "EExists";
  EExists.prototype.constructor = EExists;

  function EIsDirectory(message){
    this.message = message || '';
  }
  EIsDirectory.prototype = new Error();
  EIsDirectory.prototype.name = "EIsDirectory";
  EIsDirectory.prototype.constructor = EIsDirectory;

  function ENoEntry(message){
    this.message = message || '';
  }
  ENoEntry.prototype = new Error();
  ENoEntry.prototype.name = "ENoEntry";
  ENoEntry.prototype.constructor = ENoEntry;

  function EBusy(message){
    this.message = message || '';
  }
  EBusy.prototype = new Error();
  EBusy.prototype.name = "EBusy";
  EBusy.prototype.constructor = EBusy;

  function ENotEmpty(message){
    this.message = message || '';
  }
  ENotEmpty.prototype = new Error();
  ENotEmpty.prototype.name = "ENotEmpty";
  ENotEmpty.prototype.constructor = ENotEmpty;

  function ENotDirectory(message){
    this.message = message || '';
  }
  ENotDirectory.prototype = new Error();
  ENotDirectory.prototype.name = "ENotDirectory";
  ENotDirectory.prototype.constructor = ENotDirectory;

  function EBadFileDescriptor(message){
    this.message = message || '';
  }
  EBadFileDescriptor.prototype = new Error();
  EBadFileDescriptor.prototype.name = "EBadFileDescriptor";
  EBadFileDescriptor.prototype.constructor = EBadFileDescriptor;

  function ENotImplemented(message){
    this.message = message || '';
  }
  ENotImplemented.prototype = new Error();
  ENotImplemented.prototype.name = "ENotImplemented";
  ENotImplemented.prototype.constructor = ENotImplemented;

  function ENotMounted(message){
    this.message = message || '';
  }
  ENotMounted.prototype = new Error();
  ENotMounted.prototype.name = "ENotMounted";
  ENotMounted.prototype.constructor = ENotMounted;

  function EInvalid(message){
    this.message = message || '';
  }
  EInvalid.prototype = new Error();
  EInvalid.prototype.name = "EInvalid";
  EInvalid.prototype.constructor = EInvalid;

  function EIO(message){
    this.message = message || '';
  }
  EIO.prototype = new Error();
  EIO.prototype.name = "EIO";
  EIO.prototype.constructor = EIO;

  function EFileSystemError(message){
    this.message = message || '';
  }
  EFileSystemError.prototype = new Error();
  EFileSystemError.prototype.name = "EFileSystemError";
  EFileSystemError.prototype.constructor = EFileSystemError;

  return {
    EExists: EExists,
    EIsDirectory: EIsDirectory,
    ENoEntry: ENoEntry,
    EBusy: EBusy,
    ENotEmpty: ENotEmpty,
    ENotDirectory: ENotDirectory,
    EBadFileDescriptor: EBadFileDescriptor,
    ENotImplemented: ENotImplemented,
    ENotMounted: ENotMounted,
    EInvalid: EInvalid,
    EIO: EIO
  };

});
