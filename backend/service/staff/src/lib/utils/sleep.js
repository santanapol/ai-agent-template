/**
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Exponential backoff delay for revoke retries (attempt 0 → baseMs).
 * @param {number} attempt zero-based attempt index before next retry
 * @param {number} baseMs
 */
export function revokeBackoffDelayMs(attempt, baseMs) {
  return baseMs * 2 ** attempt;
}
