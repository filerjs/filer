'use strict';
const expect = require('chai').expect;
const bufferDefault = require('../../../shims/buffer').default;
const bufferNamed = require('../../../shims/buffer').Buffer;
const bufferActual = require('../../../src/index').Buffer;

describe('path shim', () => {
  it('default export should be defined', () => {
    expect(bufferDefault).to.not.be.undefined;
  });

  it('named export should be defined', () => {
    expect(bufferNamed).to.not.be.undefined;
  });

  it('default export should be re-exposing Buffer', () => {
    expect(bufferDefault).to.equal(bufferActual);
  });

  it('named export should be re-exposing Buffer', () => {
    expect(bufferNamed).to.equal(bufferActual);
  });
});
