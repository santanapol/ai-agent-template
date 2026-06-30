/**
 * @param {{ script: string, compiledScript?: string | null }} report
 * @returns {string}
 */
export function resolveRunnableScript(report) {
  if (typeof report.compiledScript === "string" && report.compiledScript.trim()) {
    return report.compiledScript;
  }
  throw new Error(
    "[ReportScript] compiledScript is required — run migrate-report-scripts or Validate + Test Run in UI",
  );
}

/**
 * @param {import('./reports.repository.js').Report} report
 * @returns {boolean}
 */
export function hasRunnableCompiledScript(report) {
  return (
    typeof report.compiledScript === "string" && report.compiledScript.trim() !== ""
  );
}
