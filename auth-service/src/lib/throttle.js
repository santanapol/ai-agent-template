const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 30 * 60 * 1000
const THRESHOLD = 10

export { WINDOW_MS, LOCK_MS, THRESHOLD }

/**
 * @param {Date} now
 * @param {{ window_started_at: Date, fail_count: number, locked_until?: Date | null } | null} doc
 * @returns {{ window_started_at: Date, fail_count: number, locked_until: Date | null, justLocked: boolean }}
 */
export function applyFailure (now, doc) {
  if (!doc || now.getTime() - doc.window_started_at.getTime() > WINDOW_MS) {
    return {
      window_started_at: now,
      fail_count: 1,
      locked_until: null,
      justLocked: false
    }
  }
  const fail_count = doc.fail_count + 1
  const reached = fail_count >= THRESHOLD
  const locked_until = reached
    ? (doc.locked_until ?? new Date(now.getTime() + LOCK_MS))
    : (doc.locked_until ?? null)
  const justLocked = reached && !doc.locked_until
  return {
    window_started_at: doc.window_started_at,
    fail_count,
    locked_until,
    justLocked
  }
}

export function isLocked (now, locked_until) {
  return Boolean(locked_until && locked_until.getTime() > now.getTime())
}
