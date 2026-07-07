import { ObjectId } from 'mongodb'
import { signAccessJwt } from '../../lib/jwt-access.js'
import { problemPayload } from '../../lib/problem.js'
import {
  getAccessTokenGenFromRedis,
  setAccessTokenGenInRedis
} from '../../lib/redis-access-token-gen.js'
import { coerceTokenGen, ipThrottleKey, unauthorizedServiceOutcome } from './auth.helpers.js'

export const authMixin = {
  async issueAccess(user, opts = {}) {
    const sub = user._id.toHexString()
    const permissions = await this.resolveEffectivePermissions({
      ouId: user.ou_id ?? null,
      role: user.role
    })
    const homeBranchId = user.branch_id?.toHexString?.() ?? String(user.branch_id)
    const branchId = opts.activeBranchId ?? homeBranchId
    const access_token = await signAccessJwt({
      privateKey: this.privateKey,
      kid: this.env.JWT_KID,
      sub,
      role: user.role,
      roleClaim: this.env.JWT_CLAIM_ROLE,
      ouId: user.ou_id?.toHexString?.() ?? String(user.ou_id),
      branchId,
      homeBranchId,
      tokenGen: coerceTokenGen(user),
      permissions,
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttlSeconds: this.env.ACCESS_TOKEN_TTL_SECONDS
    })
    this.warnIfAccessJwtOversize(access_token, permissions)
    return { access_token, permissions }
  },

  warnIfAccessJwtOversize(token, permissions) {
    const limit = this.env.ACCESS_JWT_SOFT_LIMIT_BYTES ?? 4096
    const bytes = Buffer.byteLength(token, 'utf8')
    if (bytes > limit) {
      this.log?.warn?.(
        { bytes, limit, permission_entries: permissions.length },
        'access JWT exceeds soft size limit'
      )
    }
  },

  pickRefreshToken({ cookies, cookieName, body }) {
    const c = cookies?.[cookieName]
    if (c) return { raw: c, channel: 'cookie' }
    if (body?.refresh_token) return { raw: body.refresh_token, channel: 'native' }
    return { raw: null, channel: null }
  },

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
        expires_at,
        active_branch_id: current.active_branch_id ?? null
      },
      session
    )
    await this.repo.revokeRefreshById(current._id, now, session)
    await this.repo.setReplacedBy(current._id, newId, session)
  },

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
    return unauthorizedServiceOutcome(type, this.types)
  },

  async assertAccessTokenGenMatches({ user_id_hex, token_gen_claim }) {
    const claim =
      typeof token_gen_claim === 'number'
        ? token_gen_claim
        : Number.parseInt(String(token_gen_claim ?? ''), 10)
    if (!Number.isInteger(claim) || claim < 0) {
      return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
    }

    const user = await this.repo.findUserById(new ObjectId(user_id_hex))
    if (!user) {
      return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
    }

    const expected = coerceTokenGen(user)
    if (claim !== expected) {
      return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
    }

    if (this.redisClient) {
      try {
        const redisGen = await getAccessTokenGenFromRedis(this.redisClient, user_id_hex)
        if (redisGen === null) {
          return unauthorizedServiceOutcome(
            this.types.invalidToken,
            this.types,
            'Access token generation is unknown (missing Redis record).'
          )
        }
        if (redisGen !== expected) {
          return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
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
  },

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
}
