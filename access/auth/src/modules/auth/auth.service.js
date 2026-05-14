import { createHash } from 'node:crypto'
import { ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { applyFailure, isLocked } from '../../lib/throttle.js'
import { generateOpaqueRefresh, hashRefreshToken } from '../../lib/refresh-token.js'
import { signAccessJwt } from '../../lib/jwt-access.js'

function normalizeUsername(u) {
  return String(u).trim().toLowerCase()
}

function ipDigest(ip) {
  return createHash('sha256').update(String(ip)).digest('hex').slice(0, 24)
}

function userThrottleKey(userId) {
  return `user:${userId.toHexString()}`
}

function ipThrottleKey(ip) {
  return `ip:${ip}`
}

/** MongoDB standalone ไม่รองรับ multi-document transaction */
function isTransactionUnsupportedOnTopology(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code === 20 && err.codeName === 'IllegalOperation') return true
  return /Transaction numbers are only allowed on a replica set member or mongos/i.test(
    String(err.message)
  )
}

/** Envelope for login/refresh outcomes that surface as HTTP 401 + RFC 7807 type. */
function unauthorizedServiceOutcome(type) {
  return { ok: false, status: 401, type, body: null, cookie: null }
}

export class AuthService {
  /**
   * @param {{
   *  env: Record<string, unknown>
   *  repo: import('./auth.repository.js').AuthRepository
   *  mongoClient: import('mongodb').MongoClient
   *  privateKey: import('jose').KeyLike
   *  types: ReturnType<typeof import('../../lib/problem.js').problemTypes>
   * }} p
   */
  constructor({ env, repo, mongoClient, privateKey, types }) {
    this.env = env
    this.repo = repo
    this.mongoClient = mongoClient
    this.privateKey = privateKey
    this.types = types
  }

  async audit({ event_type, outcome, request_id, user_id, ip, detail_safe }) {
    try {
      await this.repo.insertAudit({
        event_type,
        outcome,
        request_id,
        user_id,
        ip_digest: ip ? ipDigest(ip) : null,
        detail_safe
      })
    } catch {
      // never block auth on audit failure
    }
  }

  async assertNotLocked({ ip, userId, now }) {
    const ipDoc = await this.repo.getThrottle(ipThrottleKey(ip))
    if (isLocked(now, ipDoc?.locked_until)) {
      return { blocked: true, status: 429, type: this.types.ipThrottle }
    }
    if (userId) {
      const uDoc = await this.repo.getThrottle(userThrottleKey(userId))
      if (isLocked(now, uDoc?.locked_until)) {
        return { blocked: true, status: 423, type: this.types.accountLocked }
      }
    }
    return { blocked: false }
  }

  async recordFailures(keys, now) {
    for (const key of keys) {
      const doc = await this.repo.getThrottle(key)
      const next = applyFailure(now, doc)
      await this.repo.setThrottle(
        key,
        {
          window_started_at: next.window_started_at,
          fail_count: next.fail_count,
          locked_until: next.locked_until
        },
        undefined
      )
    }
  }

  async clearThrottleKeys(keys) {
    await this.repo.deleteThrottleKeys(keys, undefined)
  }

  async issueAccess(user) {
    const sub = user._id.toHexString()
    return signAccessJwt({
      privateKey: this.privateKey,
      kid: this.env.JWT_KID,
      sub,
      role: user.role,
      roleClaim: this.env.JWT_CLAIM_ROLE,
      ouId: user.ou_id?.toHexString?.() ?? String(user.ou_id),
      branchId: user.branch_id?.toHexString?.() ?? String(user.branch_id),
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttlSeconds: this.env.ACCESS_TOKEN_TTL_SECONDS
    })
  }

  async login({ username, password, client_kind, ip, request_id }) {
    const now = new Date()
    const un = normalizeUsername(username)
    const ipKey = ipThrottleKey(ip)

    const lock0 = await this.assertNotLocked({ ip, userId: null, now })
    if (lock0.blocked) return { ...lock0, body: null, cookie: null }

    const user = await this.repo.findUserByUsername(un)

    if (user) {
      const lock1 = await this.assertNotLocked({ ip, userId: user._id, now })
      if (lock1.blocked) return { ...lock1, body: null, cookie: null }
    }

    if (!user) {
      await this.recordFailures([ipKey], now)
      await this.audit({
        event_type: 'auth.login',
        outcome: 'fail',
        request_id,
        user_id: null,
        ip,
        detail_safe: { reason: 'invalid_credentials' }
      })
      return unauthorizedServiceOutcome(this.types.invalidCredentials)
    }

    let valid = false
    try {
      valid = await argon2.verify(user.password_hash, password, {
        type: argon2.argon2id,
        memoryCost: this.env.ARGON2_MEMORY_KIB,
        timeCost: this.env.ARGON2_TIME,
        parallelism: this.env.ARGON2_PARALLELISM
      })
    } catch {
      valid = false
    }

    if (!valid) {
      await this.recordFailures([ipKey, userThrottleKey(user._id)], now)
      await this.audit({
        event_type: 'auth.login',
        outcome: 'fail',
        request_id,
        user_id: user._id,
        ip,
        detail_safe: { reason: 'invalid_credentials' }
      })
      return unauthorizedServiceOutcome(this.types.invalidCredentials)
    }

    await this.clearThrottleKeys([ipKey, userThrottleKey(user._id)])

    const family_id = new ObjectId()
    const refreshPlain = generateOpaqueRefresh()
    const token_hash = hashRefreshToken(refreshPlain)
    const expires_at = new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000)
    await this.repo.insertRefreshToken(
      {
        user_id: user._id,
        family_id,
        token_hash,
        expires_at
      },
      undefined
    )

    const access_token = await this.issueAccess(user)
    const useCookie = client_kind !== 'native'

    await this.audit({
      event_type: 'auth.login',
      outcome: 'success',
      request_id,
      user_id: user._id,
      ip,
      detail_safe: { client_kind }
    })

    const body = {
      access_token,
      expires_in: this.env.ACCESS_TOKEN_TTL_SECONDS,
      token_type: 'Bearer',
      ...(useCookie ? {} : { refresh_token: refreshPlain })
    }

    return {
      ok: true,
      status: 200,
      body,
      cookie: useCookie ? { name: this.env.REFRESH_COOKIE_NAME, value: refreshPlain } : null
    }
  }

  pickRefreshToken({ cookies, cookieName, body }) {
    const c = cookies?.[cookieName]
    if (c) return { raw: c, channel: 'cookie' }
    if (body?.refresh_token) return { raw: body.refresh_token, channel: 'native' }
    return { raw: null, channel: null }
  }

  /**
   * หมุน refresh token (อ่าน current → insert ใหม่ → revoke เดิม) — ใช้ร่วมกับ transaction หรือไม่ก็ได้
   * @param {import('mongodb').ClientSession | undefined} session
   */
  async rotateRefreshTokenTxnBody({ hash, now, newHash, expires_at, row }, session) {
    const current = await this.repo.findRefreshByTokenHash(hash, session)
    if (!current || current.revoked_at) {
      throw new Error('CONFLICT')
    }
    if (current.expires_at <= now) throw new Error('EXPIRED')
    const newId = await this.repo.insertRefreshToken(
      {
        user_id: row.user_id,
        family_id: row.family_id,
        token_hash: newHash,
        expires_at
      },
      session
    )
    await this.repo.revokeRefreshById(current._id, now, session)
    await this.repo.setReplacedBy(current._id, newId, session)
  }

  async refresh({ rawRefresh, refreshChannel, ip, request_id }) {
    const now = new Date()
    const useCookieChannel = refreshChannel === 'cookie'

    if (!rawRefresh) {
      await this.recordFailures([ipThrottleKey(ip)], now)
      await this.audit({
        event_type: 'auth.refresh',
        outcome: 'fail',
        request_id,
        user_id: null,
        ip,
        detail_safe: { reason: 'missing_token' }
      })
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    const hash = hashRefreshToken(rawRefresh)
    const row = await this.repo.findRefreshByTokenHash(hash)

    if (!row) {
      await this.recordFailures([ipThrottleKey(ip)], now)
      await this.audit({
        event_type: 'auth.refresh',
        outcome: 'fail',
        request_id,
        user_id: null,
        ip,
        detail_safe: { reason: 'not_found' }
      })
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    if (row.revoked_at) {
      await this.repo.revokeFamilyActive(row.family_id, now)
      await this.recordFailures([ipThrottleKey(ip)], now)
      await this.audit({
        event_type: 'auth.refresh',
        outcome: 'fail',
        request_id,
        user_id: row.user_id,
        ip,
        detail_safe: { reason: 'token_reuse' }
      })
      return unauthorizedServiceOutcome(this.types.tokenReuse)
    }

    if (row.expires_at <= now) {
      await this.recordFailures([ipThrottleKey(ip)], now)
      await this.audit({
        event_type: 'auth.refresh',
        outcome: 'fail',
        request_id,
        user_id: row.user_id,
        ip,
        detail_safe: { reason: 'expired' }
      })
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    const u = await this.repo.findUserById(row.user_id)
    if (!u) {
      await this.recordFailures([ipThrottleKey(ip)], now)
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    const newPlain = generateOpaqueRefresh()
    const newHash = hashRefreshToken(newPlain)
    const expires_at = new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000)

    const session = this.mongoClient.startSession()
    try {
      try {
        await session.withTransaction(async () => {
          await this.rotateRefreshTokenTxnBody({ hash, now, newHash, expires_at, row }, session)
        })
      } catch (e) {
        if (isTransactionUnsupportedOnTopology(e)) {
          await this.rotateRefreshTokenTxnBody({ hash, now, newHash, expires_at, row }, undefined)
        } else {
          throw e
        }
      }
    } catch {
      await this.recordFailures([ipThrottleKey(ip)], now)
      await this.audit({
        event_type: 'auth.refresh',
        outcome: 'fail',
        request_id,
        user_id: row.user_id,
        ip,
        detail_safe: { reason: 'concurrent_or_invalid' }
      })
      return unauthorizedServiceOutcome(this.types.invalidToken)
    } finally {
      await session.endSession()
    }

    const access_token = await this.issueAccess(u)

    await this.audit({
      event_type: 'auth.refresh',
      outcome: 'success',
      request_id,
      user_id: u._id,
      ip,
      detail_safe: {}
    })

    const body = {
      access_token,
      expires_in: this.env.ACCESS_TOKEN_TTL_SECONDS,
      token_type: 'Bearer',
      ...(useCookieChannel ? {} : { refresh_token: newPlain })
    }

    return {
      ok: true,
      status: 200,
      body,
      cookie: useCookieChannel ? { name: this.env.REFRESH_COOKIE_NAME, value: newPlain } : null
    }
  }

  async logout({ rawRefresh, ip, request_id }) {
    const now = new Date()
    if (!rawRefresh) {
      return { ok: true, status: 204, clearCookie: true }
    }
    const hash = hashRefreshToken(rawRefresh)
    const row = await this.repo.findRefreshByTokenHash(hash)
    if (row) {
      await this.repo.revokeFamilyActive(row.family_id, now)
    }
    await this.audit({
      event_type: 'auth.logout',
      outcome: 'success',
      request_id,
      user_id: row?.user_id ?? null,
      ip,
      detail_safe: {}
    })
    return { ok: true, status: 204, clearCookie: true }
  }
}
