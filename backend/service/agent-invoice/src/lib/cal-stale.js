/** Default: 15 minutes — invoice stuck in CAL longer than this may be reset to PENDING. */
export const DEFAULT_CAL_STALE_MS = 15 * 60 * 1000;

export function calStaleMs() {
  const parsed = Number(process.env.CAL_STALE_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CAL_STALE_MS;
}

/**
 * @param {Date | string | undefined} updDate
 * @param {number} [staleMs]
 */
export function isCalLockStale(updDate, staleMs = calStaleMs()) {
  if (!updDate) return false;
  const lockedAt =
    updDate instanceof Date ? updDate.getTime() : new Date(updDate).getTime();
  if (Number.isNaN(lockedAt)) return false;
  return Date.now() - lockedAt >= staleMs;
}
