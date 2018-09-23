const u = require("../src/util");

describe("processUpdate", function () {
  // bad inputs
  // missing inputs
  // good inputs
});

describe("nonZeroOrNA", function () {
  it("handles a missing parameter", function () {
    expect(u.nonZeroOrNA(null)).toBe("n/a");
  });
  it("returns n/a for negative numbers", function () {
    expect(u.nonZeroOrNA(-0.5)).toBe("n/a");
    expect(u.nonZeroOrNA(-100)).toBe("n/a");
  });
  it("handles non-numeric parameters", function () {
    expect(u.nonZeroOrNA("not a number")).toBe("n/a");
    expect(u.nonZeroOrNA({})).toBe("n/a");
    expect(u.nonZeroOrNA([1])).toBe("n/a");
  });
  it("handles 0 correctly", function () {
    expect(u.nonZeroOrNA(0)).toBe(0);
  });
  it("handles good inputs", function () {
    expect(u.nonZeroOrNA(42.0)).toBe(42);
  });
});

describe("getRequestIP", function () {
  it("returns n/a for negative numbers", function () {
    expect(u.getRequestIP({ headers: { "x-forwarded-for": "1234"}})).toBe("1234");
    expect(u.getRequestIP({ headers: {}, connection: {remoteAddress: "1234"}})).toBe("1234");
    expect(u.getRequestIP({})).toBe(undefined);
  });

});

describe("timeAgo", function () {
  it("returns hours ago if more than an hour has passed", function () {
    let twoHours = 1000 * 60 * 60 * 2;
    let then = new Date(new Date() - twoHours);
    expect(u.timeAgo(then)).toBe("2 hours ago");
  });
  it("returns minutes ago if more than a minute has passed", function () {
    let twoMinutes = 1000 * 60 * 2;
    let then = new Date(new Date() - twoMinutes);
    expect(u.timeAgo(then)).toBe("2 minutes ago");
  });
  it("returns 'less than a minute ago' if less than a minute has passed", function () {
    let twoSeconds = 1000 * 2;
    let then = new Date(new Date() - twoSeconds);
    expect(u.timeAgo(then)).toBe("less than a minute ago");
  });
});
