/** Report ที่ใช้ insert() — disable แทน migrate (group C ใน SPEC) */
export const P1_REPORT_NAME = "Rolling Commission 777WW [New] P1";

export const MIGRATE_PROG = "scripts/migrate-report-scripts.mjs";
export const MIGRATE_USER = "migrate_script";

/**
 * @param {string[]} argv - process.argv
 */
export function parseMigrateArgs(argv) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    testRun: args.includes("--test-run"),
    failOnError: args.includes("--fail-on-error"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

/**
 * @param {{ name: string }} report
 */
export function isP1Report(report) {
  return report.name === P1_REPORT_NAME;
}

/**
 * @returns {Record<string, unknown>}
 */
export function buildP1DisableUpdate(now = new Date()) {
  return {
    enabled: false,
    validationStatus: "invalid",
    validationErrors: [
      "disabled: script uses insert() — rewrite required (see migration ticket)",
    ],
    upd_by: MIGRATE_USER,
    upd_date: now,
    upd_prog: MIGRATE_PROG,
  };
}

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result === null || result === undefined) return [];
  return [result];
}

/**
 * @param {import('../src/modules/reports/reports.repository.js').Report} report
 * @param {{ dryRun: boolean, testRun: boolean }} options
 * @param {{
 *   compileBoosterScript: (script: string) => import('../src/modules/reports/script-compiler.service.js').CompileResult,
 *   runReportScript: (opts: { script: string, params: Record<string, unknown> }) => Promise<unknown>,
 *   buildReportRunParams: (params?: Record<string, unknown>, now?: Date) => Record<string, unknown>,
 * }} deps
 */
export async function processReport(report, options, deps) {
  const { dryRun, testRun } = options;
  const { compileBoosterScript, runReportScript, buildReportRunParams } = deps;

  if (isP1Report(report)) {
    return {
      status: "disabled-p1",
      reportName: report.name,
      reportId: report._id?.toString(),
      message: "P1 uses insert() — disabled pending rewrite",
      updates: dryRun ? null : buildP1DisableUpdate(),
    };
  }

  const compiled = compileBoosterScript(report.script);
  if (!compiled.success) {
    return {
      status: "compile-failed",
      reportName: report.name,
      reportId: report._id?.toString(),
      errors: compiled.errors,
    };
  }

  let recordCount = null;
  let durationMs = null;

  if (testRun) {
    const params = buildReportRunParams(report.params ?? {}, new Date());
    const startedAt = Date.now();
    try {
      const result = await runReportScript({
        script: compiled.compiledScript,
        params,
      });
      const rows = toRows(result);
      recordCount = rows.length;
      durationMs = Date.now() - startedAt;
    } catch (error) {
      return {
        status: "test-run-failed",
        reportName: report.name,
        reportId: report._id?.toString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (dryRun) {
    return {
      status: "dry-run",
      reportName: report.name,
      reportId: report._id?.toString(),
      compiled: true,
      testRun,
      recordCount,
      durationMs,
    };
  }

  const now = new Date();
  /** @type {Record<string, unknown>} */
  const updates = {
    compiledScript: compiled.compiledScript,
    validationStatus: "valid",
    validationErrors: [],
    validatedAt: now,
    upd_by: MIGRATE_USER,
    upd_date: now,
    upd_prog: MIGRATE_PROG,
  };

  if (testRun) {
    updates.lastTestRunAt = now;
    updates.lastTestRunMeta = { recordCount, durationMs };
  }

  return {
    status: "updated",
    reportName: report.name,
    reportId: report._id?.toString(),
    recordCount,
    durationMs,
    updates,
  };
}

/**
 * @param {Array<{ status: string }>} results
 */
export function summarizeResults(results) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const result of results) {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
  return counts;
}

/**
 * @param {Array<{ status: string }>} results
 */
export function hasMigrationFailures(results) {
  return results.some(
    (result) =>
      result.status === "compile-failed" || result.status === "test-run-failed",
  );
}

export function printMigrateHelp() {
  console.log(`migrate-report-scripts — compile (and optionally test-run) prod report scripts

Usage:
  node --env-file-if-exists=.env scripts/migrate-report-scripts.mjs [options]

Options:
  --dry-run        Validate/compile only; no DB writes or test execution
  --test-run       Execute compiled scripts against MONGODB_URI_READ (yesterday params)
  --fail-on-error  Exit 1 when any report fails compile or test-run (P1 skip excluded)
  --help, -h       Show this help

Examples:
  node --env-file-if-exists=.env scripts/migrate-report-scripts.mjs --dry-run
  node --env-file-if-exists=.env scripts/migrate-report-scripts.mjs --test-run --fail-on-error
`);
}
