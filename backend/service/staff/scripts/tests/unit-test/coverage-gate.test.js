import { describe, test } from "node:test";
import assert from "node:assert";

import {
  parseCoverageTable,
  evaluateCoverageRows,
} from "../../coverage-gate.mjs";

describe("coverage-gate parser and evaluator", () => {
  test("parses coverage rows and normalizes file names", () => {
    const output = [
      "ℹ file                            | line % | branch % | funcs % | uncovered lines",
      "ℹ src/modules/profiles/profiles.service.js |  85.91 |    78.95 |  100.00 | 56-61",
      "ℹ src/lib/clients/auth-internal.client.js  |  82.64 |    76.79 |   85.71 | 30",
    ].join("\n");

    const rows = parseCoverageTable(output);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].fileName, "profiles.service.js");
    assert.strictEqual(rows[1].fileName, "auth-internal.client.js");
    assert.strictEqual(rows[1].linePct, 82.64);
    assert.strictEqual(rows[1].funcPct, 85.71);
  });

  test("reports failures for low function or line coverage", () => {
    const rows = [
      {
        file: "src/modules/profiles/profiles.service.js",
        fileName: "profiles.service.js",
        funcPct: 79.5,
        linePct: 85,
      },
      {
        file: "src/lib/clients/auth-internal.client.js",
        fileName: "auth-internal.client.js",
        funcPct: 90,
        linePct: 75,
      },
    ];

    const result = evaluateCoverageRows(rows);
    assert.strictEqual(result.targetRows.length, 2);
    assert.strictEqual(result.failures.length, 2);
    assert.match(result.failures[0], /function coverage/);
    assert.match(result.failures[1], /line coverage/);
  });
});
