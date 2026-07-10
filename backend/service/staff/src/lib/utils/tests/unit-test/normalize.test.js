import { test, describe } from "node:test";
import assert from "node:assert";

import { HttpError } from "../../../http-error.js";
import {
  normalizeEmail,
  normalizeOptionalEmail,
  normalizeOptionalTel,
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
    const { fields, unset } = normalizePatchFields({
      email: " Patch@Example.COM ",
      tel: "+66812345678",
    });
    assert.strictEqual(fields.email, "patch@example.com");
    assert.strictEqual(fields.tel, "+66812345678");
    assert.strictEqual(fields.code, undefined);
    assert.deepStrictEqual(unset, []);
  });

  test("normalizePatchFields unsets empty email and tel", () => {
    const { fields, unset } = normalizePatchFields({
      email: null,
      tel: "",
    });
    assert.deepStrictEqual(fields, {});
    assert.deepStrictEqual(unset.sort(), ["email", "tel"]);
  });

  test("normalizeEmail rejects invalid format (no @ separator)", () => {
    assert.throws(
      () => normalizeEmail("notanemail.com"),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("normalizeEmail rejects string with no TLD after dot", () => {
    assert.throws(
      () => normalizeEmail("user@domain"),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("normalizeTel rejects non-digit characters after +", () => {
    assert.throws(
      () => normalizeTel("+66abc1234"),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("normalizeUsername throws for empty string after trim", () => {
    assert.throws(
      () => normalizeUsername("   "),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("normalizeUsername throws for string exceeding 128 characters", () => {
    assert.throws(
      () => normalizeUsername("a".repeat(129)),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("normalizePatchFields returns empty fields and unset when no patchable fields provided", () => {
    const { fields, unset } = normalizePatchFields({});
    assert.deepStrictEqual(fields, {});
    assert.deepStrictEqual(unset, []);
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

  test("normalizeProfileFields omits empty email and tel", () => {
    const fields = normalizeProfileFields({
      code: "EMP-01",
      firstname: "Somchai",
      lastname: "Test",
      email: "",
      tel: null,
    });

    assert.strictEqual(fields.code, "EMP-01");
    assert.strictEqual(fields.email, undefined);
    assert.strictEqual(fields.tel, undefined);
  });

  test("normalizeOptionalEmail returns undefined for empty values", () => {
    assert.strictEqual(normalizeOptionalEmail(""), undefined);
    assert.strictEqual(normalizeOptionalEmail(null), undefined);
    assert.strictEqual(normalizeOptionalEmail(undefined), undefined);
  });

  test("normalizeOptionalTel returns undefined for empty values", () => {
    assert.strictEqual(normalizeOptionalTel("   "), undefined);
    assert.strictEqual(normalizeOptionalTel(null), undefined);
  });
});
