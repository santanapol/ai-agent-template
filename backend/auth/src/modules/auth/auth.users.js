import { ObjectId } from 'mongodb'
import { problemPayload } from '../../lib/problem.js'
import { normalizeUsername } from './auth.helpers.js'

export const authMixin = {
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
  },

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
  },

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
