#!/usr/bin/env node
/**
 * Enforces coverage thresholds on staff profiles module + auth-internal client.
 * - Per-file function coverage >= 80%
 * - Per-file line coverage >= 80%
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const FUNCTION_THRESHOLD = 80;
const LINE_THRESHOLD = 80;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGET_FILES = new Set([
  "auth-internal.client.js",
  "profiles.controller.js",
  "profiles.repository.js",
  "profiles.route.js",
  "profiles.schema.js",
  "profiles.service.js",
]);

function normalizeCoverageFileName(filePart) {
  return path.basename(filePart.replace(/\\/g, "/"));
}

export function parseCoverageTable(output) {
  const rows = [];
  for (const line of output.split("\n")) {
    if (!line.includes("|") || line.includes("---")) continue;
    const pipeIdx = line.indexOf("|");
    if (pipeIdx < 0) continue;
    const filePart = line
      .slice(0, pipeIdx)
      .replace(/^[ℹ▶✔✖\s]+/, "")
      .trim();
    if (!filePart.endsWith(".js")) continue;

    const cols = line
      .slice(pipeIdx + 1)
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 3) continue;

    const [lineCol, , funcCol] = cols;
    const linePct = Number.parseFloat(lineCol);
    const funcPct = Number.parseFloat(funcCol);
    if (Number.isNaN(funcPct) || Number.isNaN(linePct)) continue;

    rows.push({
      file: filePart,
      fileName: normalizeCoverageFileName(filePart),
      funcPct,
      linePct,
    });
  }
  return rows;
}

export function evaluateCoverageRows(rows) {
  const targetRows = rows.filter((row) => TARGET_FILES.has(row.fileName));
  const failures = targetRows.flatMap((row) => {
    const rowFailures = [];
    if (row.funcPct < FUNCTION_THRESHOLD) {
      rowFailures.push(
        `${row.file}: function coverage ${row.funcPct.toFixed(2)}% < ${FUNCTION_THRESHOLD}%`,
      );
    }
    if (row.linePct < LINE_THRESHOLD) {
      rowFailures.push(
        `${row.file}: line coverage ${row.linePct.toFixed(2)}% < ${LINE_THRESHOLD}%`,
      );
    }
    return rowFailures;
  });
  return { targetRows, failures };
}

function resolveEnvFileArg() {
  return existsSync(path.join(ROOT, ".env.test"))
    ? "--env-file=.env.test"
    : "--env-file=.env";
}

export function runCoverageGate() {
  const run = spawnSync(
    process.execPath,
    [
      resolveEnvFileArg(),
      "--experimental-test-coverage",
      "--test",
      "--test-concurrency=1",
    ],
    {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "test", TZ: "UTC" },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (run.status !== 0) {
    return { ok: false, output, exitCode: run.status ?? 1 };
  }

  const rows = parseCoverageTable(output);
  const { targetRows, failures } = evaluateCoverageRows(rows);
  if (targetRows.length === 0) {
    return {
      ok: false,
      output,
      exitCode: 1,
      targetRows,
      failures: ["coverage-gate: no matching files in coverage report"],
    };
  }

  return {
    ok: failures.length === 0,
    output,
    exitCode: failures.length === 0 ? 0 : 1,
    targetRows,
    failures,
  };
}

function printCoverageSummary(targetRows) {
  console.log("coverage-gate — target files (function % / line %):");
  for (const row of targetRows) {
    const ok = row.funcPct >= FUNCTION_THRESHOLD ? "ok" : "FAIL";
    console.log(
      `  [${ok}] ${row.file}: ${row.funcPct.toFixed(2)}% / ${row.linePct.toFixed(2)}%`,
    );
  }
}

function main() {
  const result = runCoverageGate();
  if (!result.ok && result.output) {
    console.error(result.output);
  }

  if (!result.targetRows || result.targetRows.length === 0) {
    for (const msg of result.failures ?? []) console.error(msg);
    process.exit(result.exitCode ?? 1);
  }

  printCoverageSummary(result.targetRows);
  if (result.failures && result.failures.length > 0) {
    console.error("\ncoverage-gate failed:");
    for (const msg of result.failures) console.error(`  - ${msg}`);
    process.exit(result.exitCode ?? 1);
  }

  console.log(
    `\ncoverage-gate passed (function >= ${FUNCTION_THRESHOLD}% and line >= ${LINE_THRESHOLD}% per file).`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}
