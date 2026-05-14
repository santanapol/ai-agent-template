"use strict";

const { buildMeFromTrustedHeaders } = require("../../me.service");

describe("buildMeFromTrustedHeaders", () => {
  it("returns userId, ou, branch, and null role when role header absent", () => {
    const result = buildMeFromTrustedHeaders({
      "x-user-id": " user-1 ",
      "x-user-ou": "ou-a",
      "x-user-branch": "br-1",
    });
    expect(result).toEqual({
      userId: "user-1",
      ou: "ou-a",
      branch: "br-1",
      role: null,
    });
  });

  it("trims role when present", () => {
    const result = buildMeFromTrustedHeaders({
      "x-user-id": "u",
      "x-user-ou": "o",
      "x-user-branch": "b",
      "x-user-role": "  admin  ",
    });
    expect(result.role).toBe("admin");
  });

  it("uses first array element for headers", () => {
    const result = buildMeFromTrustedHeaders({
      "x-user-id": ["arr-user"],
      "x-user-ou": ["ou-x"],
      "x-user-branch": ["br-y"],
    });
    expect(result.userId).toBe("arr-user");
  });

  it("throws MISSING_GATEWAY_USER_CONTEXT when userId empty", () => {
    expect(() =>
      buildMeFromTrustedHeaders({
        "x-user-id": "   ",
        "x-user-ou": "o",
        "x-user-branch": "b",
      }),
    ).toThrow("MISSING_GATEWAY_USER_CONTEXT");
  });

  it("throws INVALID_USER_CONTEXT when userId too long", () => {
    const long = "x".repeat(129);
    expect(() =>
      buildMeFromTrustedHeaders({
        "x-user-id": long,
        "x-user-ou": "o",
        "x-user-branch": "b",
      }),
    ).toThrow("INVALID_USER_CONTEXT");
  });
});
