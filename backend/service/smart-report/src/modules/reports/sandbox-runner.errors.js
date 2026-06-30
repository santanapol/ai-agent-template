export const SANDBOX_ERROR_CODES = {
  INVALID_SCRIPT: "INVALID_SCRIPT",
  TIMEOUT: "TIMEOUT",
  EXECUTION_FAILED: "EXECUTION_FAILED",
};

export class SandboxRunnerError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = "SandboxRunnerError";
    this.code = code;
  }
}
