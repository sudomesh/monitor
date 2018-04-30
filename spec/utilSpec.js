const u = require("../util");

describe("processUpdate", function() {
  // bad inputs
  // missing inputs
  // good inputs
});

describe("processParameter", function() {
  it("handles a missing parameter", function() {
    expect(u.processParameter(null)).toBe("n/a");
  });
  it("handles non-numeric parameters", function() {
    expect(u.processParameter("not a number")).toBe("n/a");
  });
  it("handles 0 correctly", function() {
    expect(u.processParameter("0")).toBe(0);
  });
  it("handles arbitrary 0's", function() {
    expect(u.processParameter("0000000")).toBe(0);
  });
  it("handles good inputs", function() {
    expect(u.processParameter("42")).toBe(42);
  });
});

describe("messageFromCacheData", function() {
});

describe("jsonFromCacheData", function() {
});
