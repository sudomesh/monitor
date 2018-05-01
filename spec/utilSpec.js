var util = require("../util");

describe("processParameter", function() {
  it("handles an undefined parameter", function() {
    expect(util.processParameter(undefined)).toBe("n/a");
  });
  it("handles a missing parameter", function() {
    expect(util.processParameter(null)).toBe("n/a");
  });
  it("handles non-numeric parameters", function() {
    expect(util.processParameter("not a number")).toBe("n/a");
  });
  it("handles 0 correctly", function() {
    expect(util.processParameter("0")).toBe(0);
  });
  it("handles arbitrary 0's", function() {
    expect(util.processParameter("0000000")).toBe(0);
  });
  it("handles good inputs", function() {
    expect(util.processParameter("42")).toBe(42);
  });
});
