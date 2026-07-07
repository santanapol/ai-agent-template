import { ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { problemPayload } from '../../lib/problem.js'
import { coerceTokenGen, unauthorizedServiceOutcome } from './auth.helpers.js'

export const authMixin = {
  async hashPassword(plain) {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.env.ARGON2_MEMORY_KIB,
      timeCost: this.env.ARGON2_TIME,
      parallelism: this.env.ARGON2_PARALLELISM
    })
  },

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
  },

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
  },

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
  },

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
      return unauthorizedServiceOutcome(this.types.invalidCredentials, this.types)
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
}
