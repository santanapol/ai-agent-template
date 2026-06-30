import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  issueTestRunToken,
  verifyTestRunToken,
  digestScriptValue,
} from "../../test-run-token.service.js";

describe("test-run-token.service", () => {
  const originalSecret = process.env.TEST_RUN_TOKEN_SECRET;
  const originalTtl = process.env.TEST_RUN_TOKEN_TTL_MS;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TEST_RUN_TOKEN_SECRET;
    } else {
      process.env.TEST_RUN_TOKEN_SECRET = originalSecret;
    }
    if (originalTtl === undefined) {
      delete process.env.TEST_RUN_TOKEN_TTL_MS;
    } else {
      process.env.TEST_RUN_TOKEN_TTL_MS = originalTtl;
    }
  });

  test("issues and verifies a valid token", () => {
    process.env.TEST_RUN_TOKEN_SECRET = "unit-test-secret";
    const script = "db.col.find({});";
    const compiledScript = "withReport(async () => { return []; });";
    const token = issueTestRunToken({
      script,
      compiledScript,
      recordCount: 3,
      durationMs: 42,
    });

    const result = verifyTestRunToken(token, { script, compiledScript });
    assert.equal(result.valid, true);
    assert.equal(result.recordCount, 3);
    assert.equal(result.durationMs, 42);
    assert.ok(result.testedAt instanceof Date);
  });

  test("rejects token when script hash mismatches", () => {
    process.env.TEST_RUN_TOKEN_SECRET = "unit-test-secret";
    const token = issueTestRunToken({
      script: "a",
      compiledScript: "withReport(async () => {});",
      recordCount: 1,
      durationMs: 1,
    });

    const result = verifyTestRunToken(token, {
      script: "b",
      compiledScript: "withReport(async () => {});",
    });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "script-hash-mismatch");
  });

  test("rejects expired token", () => {
    process.env.TEST_RUN_TOKEN_SECRET = "unit-test-secret";
    process.env.TEST_RUN_TOKEN_TTL_MS = "1";
    const token = issueTestRunToken({
      script: "a",
      compiledScript: "withReport(async () => {});",
      recordCount: 1,
      durationMs: 1,
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        const result = verifyTestRunToken(token, {
          script: "a",
          compiledScript: "withReport(async () => {});",
        });
        assert.equal(result.valid, false);
        assert.equal(result.reason, "expired");
        resolve();
      }, 5);
    });
  });

  test("digestScriptValue is stable for the same input", () => {
    process.env.TEST_RUN_TOKEN_SECRET = "unit-test-secret";
    assert.equal(digestScriptValue("abc"), digestScriptValue("abc"));
    assert.notEqual(digestScriptValue("abc"), digestScriptValue("def"));
  });
});
