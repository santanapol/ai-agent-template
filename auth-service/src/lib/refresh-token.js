import { createHash, randomBytes } from 'node:crypto'

export function generateOpaqueRefresh () {
  return randomBytes(32).toString('base64url')
}

export function hashRefreshToken (token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
