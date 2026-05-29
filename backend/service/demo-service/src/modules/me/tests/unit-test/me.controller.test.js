import { test, describe } from "node:test";
import assert from "node:assert";
import { getMe } from "../../me.controller.js";
import { HttpError } from "../../../../lib/http-error.js";

describe("me.controller", () => {
  test("throws 403 MISSING_GATEWAY_USER_CONTEXT when user id is missing", async () => {
    const request = { headers: {} };
    const reply = {};
    try {
      await getMe(request, reply);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err instanceof HttpError);
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.code, "MISSING_GATEWAY_USER_CONTEXT");
    }
  });

  test("throws 403 INVALID_USER_CONTEXT when user id is invalid", async () => {
    const request = {
      headers: {
        "x-user-id": "a".repeat(129),
        "x-user-ou": "test",
        "x-user-branch": "test",
      },
    };
    const reply = {};
    try {
      await getMe(request, reply);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err instanceof HttpError);
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.code, "INVALID_USER_CONTEXT");
    }
  });

  test("re-throws unknown errors", async () => {
    const request = {
      get headers() {
        throw new Error("Unknown error");
      },
    };
    const reply = {};
    try {
      await getMe(request, reply);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.strictEqual(err.message, "Unknown error");
    }
  });
});
