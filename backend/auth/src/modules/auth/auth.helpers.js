import { createHash } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { problemPayload } from '../../lib/problem.js'
import { codeForProblemType } from '../../lib/auth-problem-codes.js'

export const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/u

export function normalizeUsername(u) {
  return String(u).trim().toLowerCase()
}

export function ipDigest(ip) {
  return createHash('sha256').update(String(ip)).digest('hex').slice(0, 24)
}

export function userThrottleKey(userId) {
  return `user:${userId.toHexString()}`
}

export function ipThrottleKey(ip) {
  return `ip:${ip}`
}

export function coerceTokenGen(user) {
  const v = user.access_token_gen
  return typeof v === 'number' && Number.isInteger(v) ? v : 0
}

/** @param {import('mongodb').ObjectId | string | null | undefined} value */
export function activeBranchIdHex(value) {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  if (value instanceof ObjectId) return value.toHexString()
  if (typeof value.toHexString === 'function') return value.toHexString()
  return String(value)
}

export function problemTitleForStatus(status) {
  if (status === 404) return 'Not Found'
  if (status === 503) return 'Service Unavailable'
  return 'Forbidden'
}

export function buildAccessTokenResponseBody(
  access_token,
  expiresInSeconds,
  refreshPlain,
  omitRefreshToken,
  permissions
) {
  return {
    access_token,
    expires_in: expiresInSeconds,
    token_type: 'Bearer',
    permissions,
    ...(omitRefreshToken ? {} : { refresh_token: refreshPlain })
  }
}

/** MongoDB standalone ไม่รองรับ multi-document transaction */
export function isTransactionUnsupportedOnTopology(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code === 20 && err.codeName === 'IllegalOperation') return true
  return /Transaction numbers are only allowed on a replica set member or mongos/i.test(
    String(err.message)
  )
}

/** Envelope for login/refresh outcomes that surface as HTTP 401 + RFC 7807 type. */
export function unauthorizedServiceOutcome(type, types, detail) {
  const code = codeForProblemType(types, type) || 'AUTH_UNAUTHORIZED'
  let defaultDetail = 'Unauthorized access.'
  if (type === types.invalidCredentials) {
    defaultDetail = 'Invalid username or password.'
  } else if (type === types.invalidToken) {
    defaultDetail = 'Access token is no longer valid.'
  }

  return {
    ok: false,
    status: 401,
    type,
    body: null,
    cookie: null,
    problem: problemPayload({
      type,
      title: 'Unauthorized',
      status: 401,
      detail: detail || defaultDetail,
      code
    })
  }
}
