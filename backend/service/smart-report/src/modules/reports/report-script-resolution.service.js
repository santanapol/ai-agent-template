import { compileBoosterScript } from "./script-compiler.service.js";

/**
 * @param {string} script
 * @returns {string}
 */
export function compileOnRead(script) {
  const result = compileBoosterScript(script);
  if (!result.success) {
    const message = result.errors[0]?.message ?? "Unknown compile error";
    throw new Error(`[ReportScript] compile-on-read failed: ${message}`);
  }

  process.emitWarning(
    "Report missing compiledScript; using AST compile-on-read fallback",
    { code: "SMART_REPORT_COMPILE_ON_READ" },
  );

  return result.compiledScript;
}

/**
 * @param {{ script: string, compiledScript?: string | null }} report
 * @returns {string}
 */
export function resolveRunnableScript(report) {
  if (typeof report.compiledScript === "string" && report.compiledScript.trim()) {
    return report.compiledScript;
  }
  return compileOnRead(report.script);
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
