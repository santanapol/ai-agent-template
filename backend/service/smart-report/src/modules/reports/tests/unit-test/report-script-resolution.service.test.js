import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveRunnableScript,
  hasRunnableCompiledScript,
} from "../../report-script-resolution.service.js";

describe("report-script-resolution.service", () => {
  test("resolveRunnableScript returns compiledScript when present", () => {
    const runnable = resolveRunnableScript({
      script: "db.col.find({});",
      compiledScript: "withReport(async () => { return []; });",
    });
    assert.equal(runnable, "withReport(async () => { return []; });");
  });

  test("resolveRunnableScript throws when compiledScript is missing", () => {
    assert.throws(
      () =>
        resolveRunnableScript({
          script: `db.getSiblingDB("demo").items.find({ active: true });`,
        }),
      /compiledScript is required/,
    );
  });

  test("hasRunnableCompiledScript detects empty compiledScript", () => {
    assert.equal(
      hasRunnableCompiledScript({ script: "x", compiledScript: "  " }),
      false,
    );
    assert.equal(
      hasRunnableCompiledScript({
        script: "x",
        compiledScript: "withReport(async () => {});",
      }),
      true,
    );
  });
});
