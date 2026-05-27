import { test, describe } from "node:test";
import assert from "node:assert";
import { buildMeFromTrustedHeaders } from "../../me.service.js";

describe("buildMeFromTrustedHeaders", () => {
  test("returns userId, ou, branch, and null role when role header absent", () => {
    const result = buildMeFromTrustedHeaders({
      "x-user-id": " user-1 ",
      "x-user-ou": "ou-a",
      "x-user-branch": "br-1",
    });
    assert.deepStrictEqual(result, {
      userId: "user-1",
      ou: "ou-a",
      branch: "br-1",
      role: null,
    });
  });

  test("trims role when present", () => {
    const result = buildMeFromTrustedHeaders({
      "x-user-id": "u",
      "x-user-ou": "o",
      "x-user-branch": "b",
      "x-user-role": "  admin  ",
    });
    assert.strictEqual(result.role, "admin");
  });

  test("uses first array element for headers", () => {
    const result = buildMeFromTrustedHeaders({
      "x-user-id": ["arr-user"],
      "x-user-ou": ["ou-x"],
      "x-user-branch": ["br-y"],
    });
    assert.strictEqual(result.userId, "arr-user");
  });

  test("throws MISSING_GATEWAY_USER_CONTEXT when userId empty", () => {
    assert.throws(
      () =>
        buildMeFromTrustedHeaders({
          "x-user-id": "   ",
          "x-user-ou": "o",
          "x-user-branch": "b",
        }),
      /MISSING_GATEWAY_USER_CONTEXT/,
    );
  });

  test("throws INVALID_USER_CONTEXT when userId too long", () => {
    const long = "x".repeat(129);
    assert.throws(
      () =>
        buildMeFromTrustedHeaders({
          "x-user-id": long,
          "x-user-ou": "o",
          "x-user-branch": "b",
        }),
      /INVALID_USER_CONTEXT/,
    );
  });
});
