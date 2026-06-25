/**
 * Redis contract aligned with auth `src/lib/redis-access-token-gen.js` (D1).
 * @param {string} subHex — JWT `sub` (auth user id hex)
 */
export function accessTokenGenRedisKey(subHex) {
  return `user:${subHex}:token_gen`
}

/**
 * @param {import('jose').JWTPayload | Record<string, unknown>} payload
 * @returns {number | null} null when claim missing or invalid
 */
export function parseTokenGenFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const raw = /** @type {{ token_gen?: unknown }} */ (payload).token_gen
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) return raw
  if (typeof raw === 'string' && /^\d+$/u.test(raw)) {
    const n = Number.parseInt(raw, 10)
    return Number.isInteger(n) && n >= 0 ? n : null
  }
  return null
}

/**
 * @param {{ get: (key: string) => Promise<string | null> }} client
 * @param {string} subHex
 */
export async function getCurrentTokenGenFromRedis(
  client,
  subHex,
  { rejectIfMissing = false } = {}
) {
  const value = await client.get(accessTokenGenRedisKey(subHex))
  if (value === null || value === undefined) {
    if (rejectIfMissing) return null
    return 0
  }
  const n = Number.parseInt(String(value), 10)
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('invalid token_gen value in redis')
  }
  return n
}
