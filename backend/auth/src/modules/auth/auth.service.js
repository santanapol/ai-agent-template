import { createHash } from 'node:crypto'
import { ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { applyFailure, isLocked } from '../../lib/throttle.js'
import { generateOpaqueRefresh, hashRefreshToken } from '../../lib/refresh-token.js'
import { signAccessJwt } from '../../lib/jwt-access.js'
import { anyPermissionMatches } from '../../lib/permission-match.js'
import { problemPayload } from '../../lib/problem.js'
import {
  getAccessTokenGenFromRedis,
  setAccessTokenGenInRedis
} from '../../lib/redis-access-token-gen.js'

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

function coerceTokenGen(user) {
  const v = user.access_token_gen
  return typeof v === 'number' && Number.isInteger(v) ? v : 0
}

function buildAccessTokenResponseBody(
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
   *  redisClient?: import('redis').RedisClientType | null
   *  log?: { warn: (obj: unknown, msg?: string) => void }
   * }} p
   */
  constructor({ env, repo, mongoClient, privateKey, types, redisClient = null, log = null }) {
    this.env = env
    this.repo = repo
    this.mongoClient = mongoClient
    this.privateKey = privateKey
    this.types = types
    this.redisClient = redisClient
    this.log = log
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
    } catch (err) {
      // never block auth on audit failure — but surface the failure for ops visibility
      this.log?.warn?.({ err, event_type }, 'audit insert failed')
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
    await Promise.all(
      keys.map(async (key) => {
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
      })
    )
  }

  async clearThrottleKeys(keys) {
    await this.repo.deleteThrottleKeys(keys, undefined)
  }

  /**
   * Resolution Logic ตาม SPEC: (ou_id, role) → fallback (null, role) → [] (deny by default)
   * คืน menu_keys ดิบ (exact + wildcard ปะปนได้ — ไม่ expand ที่นี่)
   * DB error ปล่อยไหลออกเป็น 5xx — ห้ามตีความเป็น [] (token ที่ดู valid แต่สิทธิ์หายเงียบ ๆ)
   * @param {{ ouId: import('mongodb').ObjectId | null, role: string }} p
   * @returns {Promise<string[]>}
   */
  async resolveEffectivePermissions({ ouId, role }) {
    let doc = await this.repo.findRolePermissions(ouId, role)
    if (!doc && ouId !== null) {
      doc = await this.repo.findRolePermissions(null, role)
    }
    return Array.isArray(doc?.menu_keys) ? doc.menu_keys : []
  }

  /**
   * โครงเมนูเฉพาะที่ผู้ใช้มีสิทธิ์ (GET /auth/me/menus) — resolve สิทธิ์สดจาก DB,
   * expand wildcard กับ auth_menus แล้วเติมโหนดบรรพบุรุษครบถึง root
   * ตอบ flat list เรียงตาม (ระดับชั้น, sort_order) ให้ frontend ประกอบ tree เอง
   * @param {{ user_id_hex: string, access_token_gen_claim: unknown }} p
   */
  async getMyMenus({ user_id_hex, access_token_gen_claim }) {
    const genCheck = await this.assertAccessTokenGenMatches({
      user_id_hex,
      token_gen_claim: access_token_gen_claim
    })
    if (!genCheck.ok) return genCheck
    const user = genCheck.user

    const permissions = await this.resolveEffectivePermissions({
      ouId: user.ou_id ?? null,
      role: user.role
    })
    const actions = await this.repo.findActionMenusForOu(user.ou_id)
    const granted = actions.filter((action) => anyPermissionMatches(permissions, action.key))

    // เติมบรรพบุรุษทีละชั้นจนถึง root (ลึกสุด 3 ระดับ — วนไม่เกิน 2 รอบ)
    const byKey = new Map(granted.map((m) => [m.key, m]))
    let pendingKeys = [...new Set(granted.map((m) => m.parent_key))].filter(
      (key) => key !== null && !byKey.has(key)
    )
    while (pendingKeys.length > 0) {
      const parents = await this.repo.findMenusByKeys(pendingKeys, user.ou_id)
      for (const parent of parents) byKey.set(parent.key, parent)
      pendingKeys = [...new Set(parents.map((m) => m.parent_key))].filter(
        (key) => key !== null && !byKey.has(key)
      )
    }

    // cap ที่ 3 ตามกฎความลึกใน SPEC — detect cycle และขึ้นลึก
    const depthOf = (menu) => {
      const seen = new Set()
      let depth = 0
      let current = menu
      while (current && current.parent_key !== null) {
        if (seen.has(current.key)) {
          throw new Error(`Menu hierarchy cycle detected: ${[...seen, current.key].join(' → ')}`)
        }
        seen.add(current.key)
        current = byKey.get(current.parent_key)
        depth += 1
        if (depth > 3) {
          throw new Error(`Menu hierarchy exceeds depth limit at key: ${current.key}`)
        }
      }
      return depth
    }
    const menus = [...byKey.values()]
      .sort((a, b) => depthOf(a) - depthOf(b) || a.sort_order - b.sort_order)
      .map((m) => ({
        key: m.key,
        label: m.label,
        type: m.type,
        parent_key: m.parent_key,
        sort_order: m.sort_order
      }))

    return { ok: true, status: 200, body: { menus } }
  }

  /**
   * ออก access JWT พร้อมเคลม `permissions` (resolve สดจาก DB ทุกครั้งที่ออก token)
   * @returns {Promise<{ access_token: string, permissions: string[] }>}
   */
  async issueAccess(user) {
    const sub = user._id.toHexString()
    const permissions = await this.resolveEffectivePermissions({
      ouId: user.ou_id ?? null,
      role: user.role
    })
    const access_token = await signAccessJwt({
      privateKey: this.privateKey,
      kid: this.env.JWT_KID,
      sub,
      role: user.role,
      roleClaim: this.env.JWT_CLAIM_ROLE,
      ouId: user.ou_id?.toHexString?.() ?? String(user.ou_id),
      branchId: user.branch_id?.toHexString?.() ?? String(user.branch_id),
      tokenGen: coerceTokenGen(user),
      permissions,
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttlSeconds: this.env.ACCESS_TOKEN_TTL_SECONDS
    })
    this.warnIfAccessJwtOversize(access_token, permissions)
    return { access_token, permissions }
  }

  /** Soft size guard — เกิน limit แค่เตือน (การแก้ที่ถูกคือยุบสิทธิ์เป็น wildcard ฝั่งข้อมูล) */
  warnIfAccessJwtOversize(token, permissions) {
    const limit = this.env.ACCESS_JWT_SOFT_LIMIT_BYTES ?? 4096
    const bytes = Buffer.byteLength(token, 'utf8')
    if (bytes > limit) {
      this.log.warn(
        { bytes, limit, permission_entries: permissions.length },
        'access JWT exceeds soft size limit'
      )
    }
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

    const { access_token, permissions } = await this.issueAccess(user)
    const useCookie = client_kind !== 'native'

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

  async failRefreshUnauthorized({ now, ip, request_id, user_id, reason, type }) {
    await this.recordFailures([ipThrottleKey(ip)], now)
    await this.audit({
      event_type: 'auth.refresh',
      outcome: 'fail',
      request_id,
      user_id,
      ip,
      detail_safe: { reason }
    })
    return unauthorizedServiceOutcome(type)
  }

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
      return unauthorizedServiceOutcome(this.types.invalidToken)
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

    const { access_token, permissions } = await this.issueAccess(u)

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

  /**
   * Internal revoke-by-user (O-16) — bump `access_token_gen` and revoke active refresh rows.
   * @param {{ user_id_hex: string, reason?: string, correlation_id?: string, request_id: string }} p
   */
  async revokeSessionsByUser({ user_id_hex, reason, correlation_id, request_id }) {
    const now = new Date()
    const userId = new ObjectId(user_id_hex)
    const result = await this.runUserTransaction((session) =>
      this.repo.bumpAccessTokenGenAndRevokeSessions(userId, now, session)
    )

    if (!result.found) return this.userNotFoundProblem()

    await this.audit({
      event_type: 'auth.sessions_revoked_by_service',
      outcome: 'success',
      request_id: correlation_id ?? request_id,
      user_id: userId,
      ip: null,
      detail_safe: reason ? { reason } : null
    })

    const redisResult = await this.publishTokenGenOrNotReady(user_id_hex, result.access_token_gen)
    if (!redisResult.ok) return redisResult

    return {
      ok: true,
      status: 200,
      body: {
        revoked_refresh_tokens: result.revoked_refresh_tokens,
        access_token_gen: result.access_token_gen
      }
    }
  }

  async hashPassword(plain) {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.env.ARGON2_MEMORY_KIB,
      timeCost: this.env.ARGON2_TIME,
      parallelism: this.env.ARGON2_PARALLELISM
    })
  }

  async verifyPasswordHash(password_hash, plain) {
    try {
      return await argon2.verify(password_hash, plain, {
        type: argon2.argon2id,
        memoryCost: this.env.ARGON2_MEMORY_KIB,
        timeCost: this.env.ARGON2_TIME,
        parallelism: this.env.ARGON2_PARALLELISM
      })
    } catch {
      return false
    }
  }

  /**
   * @template T
   * @param {(session: import('mongodb').ClientSession | undefined) => Promise<T>} fn
   */
  async runUserTransaction(fn) {
    const session = this.mongoClient.startSession()
    try {
      try {
        return await session.withTransaction(async () => fn(session))
      } catch (e) {
        if (isTransactionUnsupportedOnTopology(e)) {
          return await fn(undefined)
        }
        throw e
      }
    } finally {
      await session.endSession()
    }
  }

  /**
   * Reject stale access JWTs (claim `token_gen` must match DB; Redis when configured).
   * @param {{ user_id_hex: string, token_gen_claim: unknown }} p
   */
  async assertAccessTokenGenMatches({ user_id_hex, token_gen_claim }) {
    const claim =
      typeof token_gen_claim === 'number'
        ? token_gen_claim
        : Number.parseInt(String(token_gen_claim ?? ''), 10)
    if (!Number.isInteger(claim) || claim < 0) {
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    const user = await this.repo.findUserById(new ObjectId(user_id_hex))
    if (!user) {
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    const expected = coerceTokenGen(user)
    if (claim !== expected) {
      return unauthorizedServiceOutcome(this.types.invalidToken)
    }

    if (this.redisClient) {
      try {
        const redisGen = await getAccessTokenGenFromRedis(this.redisClient, user_id_hex)
        if (redisGen !== null && redisGen !== expected) {
          return unauthorizedServiceOutcome(this.types.invalidToken)
        }
      } catch (err) {
        this.log?.error?.({ err, user_id: user_id_hex }, 'redis token_gen read failed')
        return {
          ok: false,
          status: 503,
          problem: problemPayload({
            type: this.types.notReady,
            title: 'Service Unavailable',
            status: 503,
            detail: 'Unable to read access token generation from Redis.',
            code: 'AUTH_NOT_READY'
          })
        }
      }
    }

    return { ok: true, user }
  }

  policyProblemForPassword(password) {
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 256 ||
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password)
    ) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.passwordPolicyViolation,
          title: 'Bad Request',
          status: 400,
          detail: 'Password does not meet policy requirements.',
          code: 'AUTH_PASSWORD_POLICY_VIOLATION'
        })
      }
    }
    return null
  }

  userNotFoundProblem() {
    return {
      ok: false,
      status: 404,
      problem: problemPayload({
        type: this.types.userNotFound,
        title: 'Not Found',
        status: 404,
        detail: 'User not found.',
        code: 'AUTH_USER_NOT_FOUND'
      })
    }
  }

  async publishTokenGenOrNotReady(user_id_hex, access_token_gen) {
    if (!this.redisClient) return { ok: true }
    try {
      // TTL must span REFRESH + ACCESS so that any access JWT issued on the last valid
      // refresh token remains blockable until it naturally expires (BLOCKER-1 fix).
      const ttl =
        (this.env.REFRESH_TOKEN_TTL_SECONDS ?? 0) + (this.env.ACCESS_TOKEN_TTL_SECONDS ?? 0)
      await setAccessTokenGenInRedis(this.redisClient, user_id_hex, access_token_gen, ttl)
      return { ok: true }
    } catch (err) {
      this.log?.error?.({ err, user_id: user_id_hex }, 'redis token_gen publish failed')
      return {
        ok: false,
        status: 503,
        problem: problemPayload({
          type: this.types.notReady,
          title: 'Service Unavailable',
          status: 503,
          detail: 'Unable to publish access token generation to Redis.',
          code: 'AUTH_NOT_READY'
        })
      }
    }
  }

  /**
   * @param {{ user_id_hex: string, password: string, revoke_sessions?: boolean, reason?: string, correlation_id?: string, request_id: string }} p
   */
  async setPasswordByService({
    user_id_hex,
    password,
    revoke_sessions = true,
    reason,
    correlation_id,
    request_id
  }) {
    const policy = this.policyProblemForPassword(password)
    if (policy) return policy

    const shouldRevoke = revoke_sessions !== false
    const userId = new ObjectId(user_id_hex)

    // Read user before the transaction so we can use the pre-write token_gen without a
    // session-scoped read inside the transaction (BLOCKER-3 fix: avoids read-your-writes hazard
    // on replica sets when findUserById is called without a session).
    const preUser = await this.repo.findUserById(userId)
    if (!preUser) return this.userNotFoundProblem()

    const password_hash = await this.hashPassword(password)
    const now = new Date()
    const actor = { user_id: 'internal', route: 'POST /internal/users/:user_id/password' }

    const result = await this.runUserTransaction(async (session) => {
      const updated = await this.repo.updatePasswordHash(userId, password_hash, actor, session)
      if (!updated) {
        return { found: false, access_token_gen: 0, revoked_refresh_tokens: 0 }
      }
      if (!shouldRevoke) {
        return {
          found: true,
          access_token_gen: coerceTokenGen(preUser),
          revoked_refresh_tokens: 0
        }
      }
      return this.repo.bumpAccessTokenGenAndRevokeSessions(userId, now, session)
    })

    if (!result.found) return this.userNotFoundProblem()

    if (shouldRevoke) {
      const redisResult = await this.publishTokenGenOrNotReady(user_id_hex, result.access_token_gen)
      if (!redisResult.ok) return redisResult
    }

    await this.audit({
      event_type: 'auth.password_reset_by_service',
      outcome: 'success',
      request_id: correlation_id ?? request_id,
      user_id: userId,
      ip: null,
      detail_safe: reason ? { reason } : null
    })

    return { ok: true, status: 204 }
  }

  /**
   * @param {{ user_id_hex: string, current_password: string, new_password: string, ip: string, request_id: string }} p
   */
  async changeOwnPassword({
    user_id_hex,
    access_token_gen_claim,
    current_password,
    new_password,
    ip,
    request_id
  }) {
    const genCheck = await this.assertAccessTokenGenMatches({
      user_id_hex,
      token_gen_claim: access_token_gen_claim
    })
    if (!genCheck.ok) return genCheck

    const policy = this.policyProblemForPassword(new_password)
    if (policy) return policy

    const userId = new ObjectId(user_id_hex)
    const user = genCheck.user

    const currentValid = await this.verifyPasswordHash(user.password_hash, current_password)
    if (!currentValid) {
      await this.audit({
        event_type: 'auth.password_changed',
        outcome: 'fail',
        request_id,
        user_id: userId,
        ip,
        detail_safe: { reason: 'invalid_current_password' }
      })
      return unauthorizedServiceOutcome(this.types.invalidCredentials)
    }

    const samePassword = await this.verifyPasswordHash(user.password_hash, new_password)
    if (samePassword) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.passwordUnchanged,
          title: 'Bad Request',
          status: 400,
          detail: 'New password must differ from the current password.',
          code: 'AUTH_PASSWORD_UNCHANGED'
        })
      }
    }

    const password_hash = await this.hashPassword(new_password)
    const now = new Date()
    const actor = { user_id: user_id_hex, route: 'POST /auth/me/password' }

    const txnResult = await this.runUserTransaction(async (session) => {
      const updated = await this.repo.updatePasswordHash(userId, password_hash, actor, session)
      if (!updated) {
        return { found: false, access_token_gen: 0, revoked_refresh_tokens: 0 }
      }
      return this.repo.bumpAccessTokenGenAndRevokeSessions(userId, now, session)
    })

    if (!txnResult.found) return this.userNotFoundProblem()

    const redisResult = await this.publishTokenGenOrNotReady(
      user_id_hex,
      txnResult.access_token_gen
    )
    if (!redisResult.ok) return redisResult

    await this.audit({
      event_type: 'auth.password_changed',
      outcome: 'success',
      request_id,
      user_id: userId,
      ip,
      detail_safe: null
    })

    return { ok: true, status: 204 }
  }

  /**
   * Internal user provisioning (staff create profile without user_id).
   * @param {{ ou_id_hex: string, branch_id_hex: string, username: string, password: string, role: string, request_id: string }} p
   */
  async createUserByService({ ou_id_hex, branch_id_hex, username, password, role, request_id }) {
    const usernameNorm = normalizeUsername(username)
    const existing = await this.repo.findUserByUsername(usernameNorm)
    if (existing) {
      return {
        ok: false,
        status: 409,
        problem: problemPayload({
          type: this.types.userAlreadyExists,
          title: 'Conflict',
          status: 409,
          detail: 'A user with this username already exists.',
          code: 'AUTH_USER_ALREADY_EXISTS'
        })
      }
    }

    const password_hash = await this.hashPassword(password)

    const insertedId = await this.repo.createUser(
      {
        ou_id: new ObjectId(ou_id_hex),
        branch_id: new ObjectId(branch_id_hex),
        username: usernameNorm,
        password_hash,
        role
      },
      { user_id: 'internal', route: 'POST /internal/users' }
    )

    await this.audit({
      event_type: 'auth.user_created_by_service',
      outcome: 'success',
      request_id,
      user_id: insertedId,
      ip: null,
      detail_safe: { username: usernameNorm, role }
    })

    return {
      ok: true,
      status: 201,
      body: {
        user_id: insertedId.toHexString(),
        username: usernameNorm,
        role
      }
    }
  }

  /**
   * Internal role update (staff/platform_admin caller).
   * @param {{ user_id_hex: string, role: string, revoke_sessions?: boolean, correlation_id?: string, request_id: string }} p
   */
  async setRoleByService({
    user_id_hex,
    role,
    revoke_sessions = true,
    correlation_id,
    request_id
  }) {
    const userId = new ObjectId(user_id_hex)
    const user = await this.repo.findUserById(userId)
    if (!user) return this.userNotFoundProblem()

    const actor = { user_id: 'internal', route: 'PATCH /internal/users/:user_id/role' }

    const transactionResult = await this.runUserTransaction(async (session) => {
      const { matchedCount } = await this.repo.updateUserRole(userId, role, actor, session)
      if (matchedCount === 0) {
        throw new Error('user_not_found_in_txn')
      }
      if (revoke_sessions) {
        const now = new Date()
        return this.repo.bumpAccessTokenGenAndRevokeSessions(userId, now, session)
      }
      return {}
    }).catch((err) => {
      if (err.message === 'user_not_found_in_txn') return null
      throw err
    })

    if (!transactionResult) {
      return this.userNotFoundProblem()
    }

    if (revoke_sessions && transactionResult.access_token_gen !== undefined) {
      const redisResult = await this.publishTokenGenOrNotReady(
        user_id_hex,
        transactionResult.access_token_gen
      )
      if (!redisResult.ok) return redisResult
    }

    await this.audit({
      event_type: 'auth.role_changed_by_service',
      outcome: 'success',
      request_id: correlation_id ?? request_id,
      user_id: userId,
      ip: null,
      detail_safe: { role, revoke_sessions }
    })

    return { ok: true, status: 204 }
  }
}
