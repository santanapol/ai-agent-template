import crypto from 'node:crypto'

/**
 * Constant-time equality for UTF-8 strings of arbitrary length (SHA-256 digest compare).
 * Do not log either value.
 *
 * @param {string | undefined} provided
 * @param {string} expected
 */
export function timingSafeSecretEqual (provided, expected) {
  if (typeof expected !== 'string' || expected.length === 0) {
    return false
  }
  const a = typeof provided === 'string' ? provided : ''
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest()
  const digestB = crypto.createHash('sha256').update(expected, 'utf8').digest()
  return crypto.timingSafeEqual(digestA, digestB)
}
