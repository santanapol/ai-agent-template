import { timingSafeEqual } from 'node:crypto'

/**
 * @param {string | undefined} authorization
 * @returns {string | null}
 */
export function extractBearerToken(authorization) {
  if (typeof authorization !== 'string') return null
  const match = authorization.match(/^Bearer\s+(.+)$/iu)
  return match ? match[1] : null
}

/**
 * @param {string | null | undefined} provided
 * @param {string} expected
 */
export function constantTimeSecretEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
