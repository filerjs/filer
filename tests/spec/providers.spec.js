describe("IDBFS.Providers", function() {
  it("is defined", function() {
    expect(typeof IDBFS.Providers).not.toEqual(undefined);
  });

  it("has IndexedDB constructor", function() {
    expect(typeof IDBFS.Providers.IndexedDB).toEqual('function');
  });

  it("has Memory constructor", function() {
    expect(typeof IDBFS.Providers.Memory).toEqual('function');
  });

  it("has a Default constructor", function() {
    expect(typeof IDBFS.Providers.Default).toEqual('function');
  });

});
