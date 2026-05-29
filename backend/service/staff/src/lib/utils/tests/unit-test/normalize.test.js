import { test, describe } from "node:test";
import assert from "node:assert";

import { HttpError } from "../../../http-error.js";
import {
  normalizeEmail,
  normalizeTel,
  normalizeUsername,
  normalizePatchFields,
  normalizeProfileFields,
} from "../../normalize.js";

describe("normalize utils", () => {
  test("normalizeUsername lowercases and trims", () => {
    assert.strictEqual(
      normalizeUsername("  Prov.User@TEST.invalid  "),
      "prov.user@test.invalid",
    );
  });

  test("normalizeEmail lowercases and trims", () => {
    assert.strictEqual(
      normalizeEmail("  Somchai@Example.COM  "),
      "somchai@example.com",
    );
  });

  test("normalizeTel accepts E.164", () => {
    assert.strictEqual(normalizeTel(" +66812345678 "), "+66812345678");
  });

  test("normalizeTel rejects missing plus", () => {
    assert.throws(
      () => normalizeTel("66812345678"),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("normalizePatchFields only normalizes provided keys", () => {
    const fields = normalizePatchFields({
      email: " Patch@Example.COM ",
      tel: "+66812345678",
    });
    assert.strictEqual(fields.email, "patch@example.com");
    assert.strictEqual(fields.tel, "+66812345678");
    assert.strictEqual(fields.code, undefined);
  });

  test("normalizeProfileFields trims contact fields", () => {
    const fields = normalizeProfileFields({
      code: " EMP-01 ",
      firstname: " Somchai ",
      lastname: " Test ",
      email: "A@B.COM",
      tel: "+66812345678",
    });

    assert.strictEqual(fields.code, "EMP-01");
    assert.strictEqual(fields.email, "a@b.com");
    assert.strictEqual(fields.tel, "+66812345678");
  });
});
