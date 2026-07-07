import { ObjectId } from 'mongodb'
import { hashRefreshToken } from '../../lib/refresh-token.js'
import { BRANCH_SWITCH_ROLES } from '../../lib/branch-switch-roles.js'
import {
  OBJECT_ID_HEX,
  buildAccessTokenResponseBody,
  coerceTokenGen,
  unauthorizedServiceOutcome
} from './auth.helpers.js'

export const authMixin = {
  async getMyBranch({ user_id_hex, access_token_gen_claim, branch_id_hex, ou_id_hex }) {
    const genCheck = await this.assertAccessTokenGenMatches({
      user_id_hex,
      token_gen_claim: access_token_gen_claim
    })
    if (!genCheck.ok) return genCheck

    if (
      !branch_id_hex ||
      !ou_id_hex ||
      !OBJECT_ID_HEX.test(branch_id_hex) ||
      !OBJECT_ID_HEX.test(ou_id_hex)
    ) {
      return unauthorizedServiceOutcome(
        this.types.invalidToken,
        this.types,
        'Access token is missing required branch context.'
      )
    }

    if (!this.branchAccessResolver.isConfigured()) {
      return this.serviceProblem(
        503,
        this.types.notReady,
        'Branch master read is not configured.',
        'AUTH_NOT_READY'
      )
    }

    let branchOid
    let ouOid
    try {
      branchOid = new ObjectId(branch_id_hex)
      ouOid = new ObjectId(ou_id_hex)
    } catch {
      return this.serviceProblem(
        404,
        this.types.branchNotFound,
        'Branch not found.',
        'AUTH_BRANCH_NOT_FOUND'
      )
    }

    const branchAccess = await this.branchAccessResolver.resolveBranchAccess(branchOid, ouOid)
    if (branchAccess === 'not_found') {
      return this.serviceProblem(
        404,
        this.types.branchNotFound,
        'Branch not found.',
        'AUTH_BRANCH_NOT_FOUND'
      )
    }
    if (branchAccess === 'forbidden') {
      return this.serviceProblem(
        403,
        this.types.branchForbidden,
        'Branch is not in your organization.',
        'AUTH_BRANCH_FORBIDDEN'
      )
    }

    const branch = await this.branchAccessResolver.findBranchDisplay(branchOid, ouOid)
    if (!branch) {
      return this.serviceProblem(
        404,
        this.types.branchNotFound,
        'Branch not found.',
        'AUTH_BRANCH_NOT_FOUND'
      )
    }

    if (branchAccess === 'inactive') {
      branch.active = false
    }

    return { ok: true, status: 200, body: branch }
  },

  async listMyBranches({ user_id_hex, access_token_gen_claim, branch_id_hex, ou_id_hex }) {
    const genCheck = await this.assertAccessTokenGenMatches({
      user_id_hex,
      token_gen_claim: access_token_gen_claim
    })
    if (!genCheck.ok) return genCheck

    const user = genCheck.user

    if (
      !ou_id_hex ||
      !OBJECT_ID_HEX.test(ou_id_hex) ||
      (branch_id_hex && !OBJECT_ID_HEX.test(branch_id_hex))
    ) {
      return unauthorizedServiceOutcome(
        this.types.invalidToken,
        this.types,
        'Access token is missing required branch context.'
      )
    }

    if (!this.branchAccessResolver.isConfigured()) {
      return this.serviceProblem(
        503,
        this.types.notReady,
        'Branch master read is not configured.',
        'AUTH_NOT_READY'
      )
    }

    let ouOid
    try {
      ouOid = new ObjectId(ou_id_hex)
    } catch {
      return unauthorizedServiceOutcome(
        this.types.invalidToken,
        this.types,
        'Access token is missing required branch context.'
      )
    }

    if (!BRANCH_SWITCH_ROLES.has(user.role)) {
      if (!branch_id_hex) {
        return { ok: true, status: 200, body: { branches: [] } }
      }
      let branchOid
      try {
        branchOid = new ObjectId(branch_id_hex)
      } catch {
        return { ok: true, status: 200, body: { branches: [] } }
      }
      const branch = await this.branchAccessResolver.findBranchDisplay(branchOid, ouOid)
      return {
        ok: true,
        status: 200,
        body: { branches: branch ? [branch] : [] }
      }
    }

    const branches = await this.branchAccessResolver.listBranchesForOu(ouOid, {
      ensureBranchIds: branch_id_hex ? [branch_id_hex] : []
    })

    return { ok: true, status: 200, body: { branches } }
  },

  async switchActiveBranch({
    user_id_hex,
    access_token_gen_claim,
    branch_id,
    rawRefresh,
    ip,
    request_id
  }) {
    const genCheck = await this.assertAccessTokenGenMatches({
      user_id_hex,
      token_gen_claim: access_token_gen_claim
    })
    if (!genCheck.ok) return genCheck

    if (!rawRefresh) {
      return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
    }

    const user = genCheck.user
    if (!BRANCH_SWITCH_ROLES.has(user.role)) {
      await this.auditActiveBranchDenied({
        request_id,
        user_id: user._id,
        ip,
        reason: 'role_forbidden',
        branch_id
      })
      return this.serviceProblem(
        403,
        this.types.branchSwitchForbidden,
        'Your role cannot switch active branch.',
        'AUTH_BRANCH_SWITCH_FORBIDDEN'
      )
    }

    if (!this.branchAccessResolver.isConfigured()) {
      return this.serviceProblem(
        503,
        this.types.notReady,
        'Branch master read is not configured.',
        'AUTH_NOT_READY'
      )
    }

    let branchOid
    try {
      branchOid = new ObjectId(branch_id)
    } catch {
      return this.serviceProblem(
        404,
        this.types.branchNotFound,
        'Branch not found.',
        'AUTH_BRANCH_NOT_FOUND'
      )
    }

    const branchAccess = await this.branchAccessResolver.resolveBranchAccess(branchOid, user.ou_id)
    if (branchAccess === 'not_found') {
      await this.auditActiveBranchDenied({
        request_id,
        user_id: user._id,
        ip,
        reason: 'branch_not_found',
        branch_id
      })
      return this.serviceProblem(
        404,
        this.types.branchNotFound,
        'Branch not found.',
        'AUTH_BRANCH_NOT_FOUND'
      )
    }
    if (branchAccess === 'forbidden') {
      await this.auditActiveBranchDenied({
        request_id,
        user_id: user._id,
        ip,
        reason: 'branch_forbidden',
        branch_id
      })
      return this.serviceProblem(
        403,
        this.types.branchForbidden,
        'Branch is not in your organization.',
        'AUTH_BRANCH_FORBIDDEN'
      )
    }
    if (branchAccess === 'inactive') {
      await this.auditActiveBranchDenied({
        request_id,
        user_id: user._id,
        ip,
        reason: 'branch_inactive',
        branch_id
      })
      return this.serviceProblem(
        403,
        this.types.branchForbidden,
        'Branch is inactive.',
        'AUTH_BRANCH_FORBIDDEN'
      )
    }

    const now = new Date()
    const hash = hashRefreshToken(rawRefresh)
    const row = await this.repo.findRefreshByTokenHash(hash)
    const refreshInvalid =
      !row ||
      row.revoked_at ||
      row.expires_at <= now ||
      row.user_id?.toHexString?.() !== user_id_hex

    if (refreshInvalid) {
      return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
    }

    const activeBranchHex = branchOid.toHexString()
    const currentActiveOid = row.active_branch_id ?? user.branch_id
    if (branchOid.equals(currentActiveOid)) {
      const userForToken = { ...user, access_token_gen: coerceTokenGen(user) }
      const { access_token, permissions } = await this.issueAccess(userForToken, {
        activeBranchId: activeBranchHex
      })
      return {
        ok: true,
        status: 200,
        body: buildAccessTokenResponseBody(
          access_token,
          this.env.ACCESS_TOKEN_TTL_SECONDS,
          null,
          true,
          permissions
        )
      }
    }

    let bumpResult
    try {
      bumpResult = await this.runUserTransaction(async (session) => {
        const bump = await this.repo.bumpAccessTokenGen(user._id, session)
        if (!bump.found) throw new Error('user_not_found_in_txn')
        await this.repo.setRefreshActiveBranch(row._id, branchOid, session)
        return bump
      })
    } catch (err) {
      if (err?.message === 'user_not_found_in_txn') {
        return unauthorizedServiceOutcome(this.types.invalidToken, this.types)
      }
      throw err
    }

    const redisResult = await this.publishTokenGenOrNotReady(
      user_id_hex,
      bumpResult.access_token_gen
    )
    if (!redisResult.ok) {
      this.log?.error?.(
        { user_id: user_id_hex, branch_id: activeBranchHex },
        'branch switch: redis publish failed after DB commit'
      )
      return redisResult
    }

    const userForToken = { ...user, access_token_gen: bumpResult.access_token_gen }
    const { access_token, permissions } = await this.issueAccess(userForToken, {
      activeBranchId: activeBranchHex
    })

    await this.audit({
      event_type: 'auth.active_branch_changed',
      outcome: 'success',
      request_id,
      user_id: user._id,
      ip,
      detail_safe: { branch_id: activeBranchHex }
    })

    return {
      ok: true,
      status: 200,
      body: buildAccessTokenResponseBody(
        access_token,
        this.env.ACCESS_TOKEN_TTL_SECONDS,
        null,
        true,
        permissions
      )
    }
  }
}
