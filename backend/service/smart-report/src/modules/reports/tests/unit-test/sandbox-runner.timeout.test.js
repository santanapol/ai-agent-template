import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { resolveReportScriptTimeoutMs } from "../../sandbox-runner.service.js";

describe("resolveReportScriptTimeoutMs", () => {
  const original = process.env.REPORT_SCRIPT_TIMEOUT_MS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REPORT_SCRIPT_TIMEOUT_MS;
    } else {
      process.env.REPORT_SCRIPT_TIMEOUT_MS = original;
    }
  });

  test("defaults to 120000 when env is unset", () => {
    delete process.env.REPORT_SCRIPT_TIMEOUT_MS;
    assert.equal(resolveReportScriptTimeoutMs(), 120_000);
  });

  test("reads REPORT_SCRIPT_TIMEOUT_MS from env", () => {
    process.env.REPORT_SCRIPT_TIMEOUT_MS = "90000";
    assert.equal(resolveReportScriptTimeoutMs(), 90_000);
  });

  test("explicit timeoutMs override wins over env", () => {
    process.env.REPORT_SCRIPT_TIMEOUT_MS = "90000";
    assert.equal(resolveReportScriptTimeoutMs(50), 50);
  });

  test("falls back to default when env is invalid", () => {
    process.env.REPORT_SCRIPT_TIMEOUT_MS = "not-a-number";
    assert.equal(resolveReportScriptTimeoutMs(), 120_000);
  });
});
