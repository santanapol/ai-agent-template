/**
 * Redis key/value contract for gateway `token_gen` check (O-16 / D1).
 * Value is the string form of `auth_users.access_token_gen` (integer).
 * @param {string} subHex — JWT `sub` / `auth_users._id` hex
 */
export function accessTokenGenRedisKey(subHex) {
  return `user:${subHex}:token_gen`
}

/**
 * @param {import('redis').RedisClientType | null | undefined} client
 * @param {string} subHex
 * @param {number} accessTokenGen
 * @param {number} [ttlSeconds] — key expiry in seconds; must be REFRESH_TOKEN_TTL + ACCESS_TOKEN_TTL
 *   so that revocation is enforced until the last possible access JWT (issued on the final valid
 *   refresh token) naturally expires
 */
export async function setAccessTokenGenInRedis(client, subHex, accessTokenGen, ttlSeconds) {
  if (!client) return
  const key = accessTokenGenRedisKey(subHex)
  const opts = ttlSeconds > 0 ? { EX: ttlSeconds } : {}
  await client.set(key, String(accessTokenGen), opts)
}

/**
 * @param {import('redis').RedisClientType | null | undefined} client
 * @param {string} subHex
 * @returns {Promise<number | null>} Parsed gen, or null when key missing / no client
 */
export async function getAccessTokenGenFromRedis(client, subHex) {
  if (!client) return null
  const raw = await client.get(accessTokenGenRedisKey(subHex))
  if (raw === null || raw === undefined) return null
  const parsed = Number.parseInt(String(raw), 10)
  return Number.isInteger(parsed) ? parsed : null
}
