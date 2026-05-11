"use strict";

const { readErrorCode } = require("../../error-code");

describe("readErrorCode", () => {
  it("returns code string when error has code field", () => {
    expect(readErrorCode({ code: "INVALID_USER_CONTEXT" })).toBe(
      "INVALID_USER_CONTEXT",
    );
  });

  it("returns empty string when error has no code", () => {
    expect(readErrorCode(new Error("boom"))).toBe("");
    expect(readErrorCode(null)).toBe("");
  });
});
