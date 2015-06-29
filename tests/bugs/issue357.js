var Path = require('../..').Path;
var expect = require('chai').expect;

describe('Path.resolve does not work, issue357', function() {
  it('Path.relative() should not crash', function() {
    expect(Path.relative("/mydir", "/mydir/file")).to.equal("file");

    // https://nodejs.org/api/path.html#path_path_relative_from_to
    expect(Path.relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).to.equal("../../impl/bbb");
  });

  it('Path.resolve() should work as expectedh', function() {
    // https://nodejs.org/api/path.html#path_path_resolve_from_to
    expect(Path.resolve('/foo/bar', './baz')).to.equal('/foo/bar/baz');
    expect(Path.resolve('/foo/bar', '/tmp/file/')).to.equal('/tmp/file');
  });
});
