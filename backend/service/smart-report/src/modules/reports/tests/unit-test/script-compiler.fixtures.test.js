import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileBoosterScript } from "../../script-compiler.service.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "prod-scripts",
);

describe("script-compiler prod fixtures", () => {
  for (const fixture of [
    "group-a-single-aggregate.js",
    "group-b-batch-toarray.js",
  ]) {
    test(`compiles ${fixture}`, () => {
      const source = readFileSync(join(fixturesDir, fixture), "utf8");
      const result = compileBoosterScript(source);
      assert.equal(result.success, true, result.errors?.[0]?.message);
      assert.match(result.compiledScript, /^withReport\(async \(\) => \{/);
      assert.doesNotMatch(result.compiledScript, /\.toArray\(\)/);
    });
  }
});
