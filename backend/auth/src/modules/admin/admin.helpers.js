import { createHash } from 'node:crypto'

export function ipDigest(ip) {
  if (!ip) return null
  return createHash('sha256').update(String(ip)).digest('hex').slice(0, 24)
}
