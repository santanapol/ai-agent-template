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
 */
export async function setAccessTokenGenInRedis(client, subHex, accessTokenGen) {
  if (!client) return
  const key = accessTokenGenRedisKey(subHex)
  await client.set(key, String(accessTokenGen))
}
