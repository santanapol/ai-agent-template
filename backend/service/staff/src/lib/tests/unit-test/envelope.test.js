import { test, describe } from "node:test";
import assert from "node:assert";

import CODES from "../../error-codes.js";
import { successEnvelope, errorEnvelope } from "../../envelope.js";

describe("envelope", () => {
  test("successEnvelope field order: success, code, message, data", () => {
    const body = successEnvelope({ id: "1" }, null, CODES.SUCCESS);
    assert.deepStrictEqual(Object.keys(body), [
      "success",
      "code",
      "message",
      "data",
    ]);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");
    assert.strictEqual(body.data.id, "1");
  });

  test("successEnvelope adds pagination after data fields", () => {
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
    const body = successEnvelope([], null, CODES.SUCCESS, pagination);
    assert.strictEqual(body.pagination, pagination);
    const keys = Object.keys(body);
    assert.ok(keys.indexOf("pagination") > keys.indexOf("data"));
  });

  test("errorEnvelope has data null and requestId", () => {
    const body = errorEnvelope({
      code: CODES.RESOURCE_NOT_FOUND,
      message: "not found",
      requestId: "req-abc",
    });
    assert.deepStrictEqual(Object.keys(body), [
      "success",
      "code",
      "message",
      "data",
      "requestId",
    ]);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.data, null);
    assert.strictEqual(body.requestId, "req-abc");
  });
});
