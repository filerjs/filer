'use strict';
const expect = require('chai').expect;
const path = require('../../../shims/path');
const pathActual = require('../../../src/index').path;

describe('path shim', () => {
  it('should be defined', () => {
    expect(path).to.not.be.undefined;
  });

  it('should be re-exposing path', () => {
    expect(path).to.equal(pathActual);
  });
});
