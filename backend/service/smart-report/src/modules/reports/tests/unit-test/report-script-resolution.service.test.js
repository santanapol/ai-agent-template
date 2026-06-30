import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  compileOnRead,
  resolveRunnableScript,
  hasRunnableCompiledScript,
} from "../../report-script-resolution.service.js";

describe("report-script-resolution.service", () => {
  test("resolveRunnableScript prefers compiledScript", () => {
    const runnable = resolveRunnableScript({
      script: "db.col.find({});",
      compiledScript: "withReport(async () => { return []; });",
    });
    assert.equal(runnable, "withReport(async () => { return []; });");
  });

  test("compileOnRead compiles booster script", () => {
    const compiled = compileOnRead(
      `db.getSiblingDB("demo").items.find({ active: true });`,
    );
    assert.match(compiled, /^withReport\(async \(\) => \{/);
    assert.match(compiled, /return await/);
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
