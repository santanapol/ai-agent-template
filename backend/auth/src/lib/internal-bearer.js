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
  // Pad to equal length so timingSafeEqual always runs — prevents secret-length leak via
  // early-return timing side-channel. Length equality is checked separately afterwards.
  const len = Math.max(a.length, b.length)
  const pa = Buffer.alloc(len)
  const pb = Buffer.alloc(len)
  a.copy(pa)
  b.copy(pb)
  return timingSafeEqual(pa, pb) && a.length === b.length
}
