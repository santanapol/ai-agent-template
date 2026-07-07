import { ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { generateOpaqueRefresh, hashRefreshToken } from '../../lib/refresh-token.js'
import {
  activeBranchIdHex,
  buildAccessTokenResponseBody,
  coerceTokenGen,
  ipThrottleKey,
  normalizeUsername,
  unauthorizedServiceOutcome,
  userThrottleKey
} from './auth.helpers.js'

export const authMixin = {
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
      return unauthorizedServiceOutcome(this.types.invalidCredentials, this.types)
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
      return unauthorizedServiceOutcome(this.types.invalidCredentials, this.types)
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

    const { access_token, permissions } = await this.issueAccess(user)
    const useCookie = client_kind !== 'native'

    const redisResult = await this.publishTokenGenOrNotReady(
      user._id.toHexString(),
      coerceTokenGen(user)
    )
    if (!redisResult.ok) return { ...redisResult, body: null, cookie: null }

    await this.audit({
      event_type: 'auth.login',
      outcome: 'success',
      request_id,
      user_id: user._id,
      ip,
      detail_safe: { client_kind }
    })

    const body = buildAccessTokenResponseBody(
      access_token,
      this.env.ACCESS_TOKEN_TTL_SECONDS,
      refreshPlain,
      useCookie,
      permissions
    )

    return {
      ok: true,
      status: 200,
      body,
      cookie: useCookie ? { name: this.env.REFRESH_COOKIE_NAME, value: refreshPlain } : null
    }
  },

  async refresh({ rawRefresh, refreshChannel, ip, request_id }) {
    const now = new Date()
    const useCookieChannel = refreshChannel === 'cookie'

    if (!rawRefresh) {
      return this.failRefreshUnauthorized({
        now,
        ip,
        request_id,
        user_id: null,
        reason: 'missing_token',
        type: this.types.invalidToken
      })
    }

    const hash = hashRefreshToken(rawRefresh)
    const row = await this.repo.findRefreshByTokenHash(hash)

    if (!row) {
      return this.failRefreshUnauthorized({
        now,
        ip,
        request_id,
        user_id: null,
        reason: 'not_found',
        type: this.types.invalidToken
      })
    }

    if (row.revoked_at) {
      await this.repo.revokeFamilyActive(row.family_id, now)
      return this.failRefreshUnauthorized({
        now,
        ip,
        request_id,
        user_id: row.user_id,
        reason: 'token_reuse',
        type: this.types.tokenReuse
      })
    }

    if (row.expires_at <= now) {
      return this.failRefreshUnauthorized({
        now,
        ip,
        request_id,
        user_id: row.user_id,
        reason: 'expired',
        type: this.types.invalidToken
      })
    }

    const u = await this.repo.findUserById(row.user_id)
    if (!u) {
      await this.recordFailures([ipThrottleKey(ip)], now)
      await this.audit({
        event_type: 'auth.refresh',
        outcome: 'fail',
        request_id,
        user_id: row.user_id,
        ip,
        detail_safe: { reason: 'user_not_found' }
      })
      return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
    }

    const newPlain = generateOpaqueRefresh()
    const newHash = hashRefreshToken(newPlain)
    const expires_at = new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000)

    try {
      await this.runUserTransaction((session) =>
        this.rotateRefreshTokenTxnBody({ hash, now, newHash, expires_at, row }, session)
      )
    } catch {
      return this.failRefreshUnauthorized({
        now,
        ip,
        request_id,
        user_id: row.user_id,
        reason: 'concurrent_or_invalid',
        type: this.types.invalidToken
      })
    }

    const { access_token, permissions } = await this.issueAccess(u, {
      activeBranchId: activeBranchIdHex(row.active_branch_id)
    })

    const redisResult = await this.publishTokenGenOrNotReady(u._id.toHexString(), coerceTokenGen(u))
    if (!redisResult.ok) return { ...redisResult, body: null, cookie: null }

    await this.audit({
      event_type: 'auth.refresh',
      outcome: 'success',
      request_id,
      user_id: u._id,
      ip,
      detail_safe: {}
    })

    const body = buildAccessTokenResponseBody(
      access_token,
      this.env.ACCESS_TOKEN_TTL_SECONDS,
      newPlain,
      useCookieChannel,
      permissions
    )

    return {
      ok: true,
      status: 200,
      body,
      cookie: useCookieChannel ? { name: this.env.REFRESH_COOKIE_NAME, value: newPlain } : null
    }
  },

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
