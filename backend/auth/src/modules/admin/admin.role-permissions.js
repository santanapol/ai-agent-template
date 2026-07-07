import { validateSeedData } from '../../lib/permission-validation.js'
import { problemPayload } from '../../lib/problem.js'
import { accessTokenGenRedisKey } from '../../lib/redis-access-token-gen.js'

export const adminRolePermissionsMixin = {
  async getRolePermissions(ou_id, role) {
    const parsedOuId = ou_id === 'null' ? null : ou_id
    const filter = {}
    if (parsedOuId !== undefined) filter.ou_id = parsedOuId
    if (role !== undefined) filter.role = role

    const list = await this.repo.getRolePermissions(filter)
    return { ok: true, status: 200, body: { role_permissions: list } }
  },

  async upsertRolePermission(
    ouIdParam,
    role,
    menu_keys,
    revoke_sessions,
    { actorId, ip, request_id }
  ) {
    const ouId = ouIdParam === 'null' ? null : ouIdParam

    if (ouId !== null) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: 'OU-specific mappings are not yet supported. Only "null" is allowed.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    // Self-Lockout Prevention: ห้ามยกเลิก permissions:manage ออกจาก platform_admin
    if (role === 'platform_admin' && !menu_keys.includes('permissions:manage')) {
      // สำหรับ platform_admin, wildcard 'permissions:*' หรือ exact 'permissions:manage' ต้องมีอยู่
      const hasManage =
        menu_keys.includes('permissions:manage') || menu_keys.includes('permissions:*')
      if (!hasManage) {
        return {
          ok: false,
          status: 400,
          problem: problemPayload({
            type: this.types.validation,
            title: 'Bad Request',
            status: 400,
            detail: 'Revoking permissions:manage from platform_admin is prohibited.',
            code: 'AUTH_INVALID_REQUEST'
          })
        }
      }
    }

    const menus = await this.repo.getMenus()
    const rolePermissions = await this.repo.getRolePermissions()

    // Simulate upsert
    const simulatedMappings = rolePermissions.filter(
      (rp) => !(rp.ou_id === ouId && rp.role === role)
    )
    simulatedMappings.push({ ou_id: ouId, role, menu_keys })

    const errors = validateSeedData({ menus, rolePermissions: simulatedMappings })
    if (errors.length > 0) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: `Role permission validation failed: ${errors.join(', ')}`,
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    const now = new Date()
    const updateDoc = {
      set: {
        menu_keys,
        upd_by: actorId,
        upd_date: now,
        upd_prog: 'PUT /auth/admin/role-permissions'
      },
      setOnInsert: {
        cr_by: actorId,
        cr_date: now,
        cr_prog: 'PUT /auth/admin/role-permissions'
      }
    }

    await this.repo.upsertRolePermission(ouId, role, updateDoc)

    // Revoke sessions
    let revokedTokensCount = 0
    if (revoke_sessions) {
      // Bump user token_gen in MongoDB
      await this.repo.bumpUsersTokenGen(ouId, role)

      // Revoke in MongoDB: refresh tokens for those users
      const users = await this.repo.getUsersInScope(ouId, role)
      const userIds = users.map((u) => u._id)
      if (userIds.length > 0) {
        await this.repo.revokeRefreshTokensForUsers(userIds, now)
      }

      // Sync Redis with pipeline in chunks
      if (this.redisClient && users.length > 0) {
        const ttl =
          (this.env.REFRESH_TOKEN_TTL_SECONDS ?? 0) + (this.env.ACCESS_TOKEN_TTL_SECONDS ?? 0)

        // chunking to avoid blocking redis
        const chunkSize = 1000
        for (let i = 0; i < users.length; i += chunkSize) {
          const chunk = users.slice(i, i + chunkSize)
          const pipeline = this.redisClient.multi()

          for (const user of chunk) {
            const user_id_hex = user._id.toHexString()
            const gen = user.access_token_gen ?? 0
            const redisKey = accessTokenGenRedisKey(user_id_hex)
            pipeline.set(redisKey, String(gen))
            if (ttl > 0) {
              pipeline.expire(redisKey, ttl)
            }
          }
          await pipeline.exec()
        }
      }
      revokedTokensCount = userIds.length
    }

    await this.audit({
      event_type: 'auth.permissions_changed',
      outcome: 'success',
      request_id,
      user_id: actorId,
      ip,
      detail_safe: { action: 'upsert_role_permission', ou_id: ouIdParam, role, revoke_sessions }
    })

    return {
      ok: true,
      status: 200,
      body: {
        ou_id: ouIdParam,
        role,
        menu_keys,
        revoked_sessions: revoke_sessions,
        revoked_users_count: revokedTokensCount
      }
    }
  },

  async deleteRolePermission(ouIdParam, role, confirm, { actorId, ip, request_id }) {
    const ouId = ouIdParam === 'null' ? null : ouIdParam

    // 1. Reject non-global OU first (most specific structural guard)
    if (ouId !== null) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: 'OU-specific mappings are not yet supported. Only "null" is allowed.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    const existing = await this.repo.getRolePermissionByPair(ouId, role)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        problem: problemPayload({
          type: this.types.rolePermissionNotFound,
          title: 'Not Found',
          status: 404,
          detail: 'Role permission mapping not found.',
          code: 'AUTH_ROLE_PERMISSION_NOT_FOUND'
        })
      }
    }

    // 2. Self-Lockout Prevention: ห้ามลบ platform_admin mapping
    if (role === 'platform_admin') {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: 'Deletion of platform_admin role mapping is prohibited.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    // 3. Active users check — last gate before destructive operation
    const activeUsersCount = await this.repo.countUsersInScope(ouId, role)
    if (activeUsersCount > 0 && confirm !== true) {
      return {
        ok: false,
        status: 409,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Conflict',
          status: 409,
          detail: `Cannot delete role mapping because there are ${activeUsersCount} active users in this scope. Set confirm=true to force delete.`,
          code: 'AUTH_ROLE_PERMISSION_IN_USE'
        })
      }
    }

    await this.repo.deleteRolePermission(ouId, role)

    await this.audit({
      event_type: 'auth.permissions_changed',
      outcome: 'success',
      request_id,
      user_id: actorId,
      ip,
      detail_safe: { action: 'delete_role_permission', ou_id: ouIdParam, role }
    })

    return { ok: true, status: 204 }
  }
}
