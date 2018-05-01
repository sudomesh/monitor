const u = require("../util");

describe("processUpdate", function() {
  // bad inputs
  // missing inputs
  // good inputs
});

describe("nonZeroOrNA", function() {
  it("handles a missing parameter", function() {
    expect(u.nonZeroOrNA(null)).toBe("n/a");
  });
  it("returns n/a for negative numbers", function() {
    expect(u.nonZeroOrNA(-0.5)).toBe("n/a");
    expect(u.nonZeroOrNA(-100)).toBe("n/a");
  });
  it("handles non-numeric parameters", function() {
    expect(u.nonZeroOrNA("not a number")).toBe("n/a");
    expect(u.nonZeroOrNA({})).toBe("n/a");
    expect(u.nonZeroOrNA([1])).toBe("n/a");
  });
  it("handles 0 correctly", function() {
    expect(u.nonZeroOrNA(0)).toBe(0);
  });
  it("handles good inputs", function() {
    expect(u.nonZeroOrNA(42.0)).toBe(42);
  });
});

describe("messageFromCacheData", function() {
});

describe("jsonFromCacheData", function() {
});
