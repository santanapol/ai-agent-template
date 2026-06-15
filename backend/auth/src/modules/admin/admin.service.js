import { createHash } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { validateSeedData } from '../../lib/permission-validation.js'
import { problemPayload } from '../../lib/problem.js'
import { setAccessTokenGenInRedis } from '../../lib/redis-access-token-gen.js'

function ipDigest(ip) {
  if (!ip) return null
  return createHash('sha256').update(String(ip)).digest('hex').slice(0, 24)
}

export class AdminService {
  constructor({ repo, env, redisClient = null, log = null, types }) {
    this.repo = repo
    this.env = env
    this.redisClient = redisClient
    this.log = log
    this.types = types
  }

  async audit({ event_type, outcome, request_id, user_id, ip, detail_safe }) {
    try {
      await this.repo.insertAudit({
        event_type,
        outcome,
        request_id,
        user_id: user_id ? new ObjectId(user_id) : null,
        ip_digest: ipDigest(ip),
        detail_safe
      })
    } catch (err) {
      this.log?.warn?.({ err, event_type }, 'audit insert failed')
    }
  }

  async getMenus() {
    const menus = await this.repo.getMenus()
    return { ok: true, status: 200, body: { menus } }
  }

  async createMenu(doc, { actorId, ip, request_id }) {
    const menus = await this.repo.getMenus()
    const rolePermissions = await this.repo.getRolePermissions()

    // Simulate adding the new menu item to validate
    const simulatedMenus = [...menus, {
      ...doc,
      ou_id: null,
      cr_by: actorId,
      cr_date: new Date(),
      cr_prog: 'POST /auth/admin/menus',
      upd_by: actorId,
      upd_date: new Date(),
      upd_prog: 'POST /auth/admin/menus'
    }]

    const errors = validateSeedData({ menus: simulatedMenus, rolePermissions })
    if (errors.length > 0) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: `Menu validation failed: ${errors.join(', ')}`,
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    const now = new Date()
    const finalDoc = {
      key: doc.key,
      label: doc.label,
      type: doc.type,
      parent_key: doc.parent_key,
      sort_order: doc.sort_order,
      ou_id: null,
      cr_by: actorId,
      cr_date: now,
      cr_prog: 'POST /auth/admin/menus',
      upd_by: actorId,
      upd_date: now,
      upd_prog: 'POST /auth/admin/menus'
    }

    await this.repo.createMenu(finalDoc)

    await this.audit({
      event_type: 'auth.permissions_changed',
      outcome: 'success',
      request_id,
      user_id: actorId,
      ip,
      detail_safe: { action: 'create_menu', key: doc.key }
    })

    return { ok: true, status: 201, body: finalDoc }
  }

  async updateMenu(key, doc, ifMatch, { actorId, ip, request_id }) {
    const existing = await this.repo.getMenuByKey(key)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        problem: problemPayload({
          type: this.types.userNotFound, // Fallback error type
          title: 'Not Found',
          status: 404,
          detail: 'Menu node not found.',
          code: 'AUTH_MENU_NOT_FOUND'
        })
      }
    }

    // Optimistic locking
    const currentEtag = existing.upd_date ? existing.upd_date.toISOString() : ''
    if (!ifMatch || currentEtag !== ifMatch) {
      return {
        ok: false,
        status: 412,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Precondition Failed',
          status: 412,
          detail: 'Precondition failed (If-Match mismatch).',
          code: 'AUTH_PRECONDITION_FAILED'
        })
      }
    }

    // Self-Lockout Prevention
    if (key === 'permissions:manage') {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: 'Modification of permissions:manage key is prohibited.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    const menus = await this.repo.getMenus()
    const rolePermissions = await this.repo.getRolePermissions()

    // Simulate update
    const simulatedMenus = menus.map(m => m.key === key ? { ...m, ...doc } : m)
    const errors = validateSeedData({ menus: simulatedMenus, rolePermissions })
    if (errors.length > 0) {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: `Menu validation failed: ${errors.join(', ')}`,
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    const now = new Date()
    const updateDoc = {
      ...doc,
      upd_by: actorId,
      upd_date: now,
      upd_prog: 'PATCH /auth/admin/menus'
    }

    await this.repo.updateMenu(key, updateDoc)

    await this.audit({
      event_type: 'auth.permissions_changed',
      outcome: 'success',
      request_id,
      user_id: actorId,
      ip,
      detail_safe: { action: 'update_menu', key }
    })

    return { ok: true, status: 200, body: { ...existing, ...updateDoc } }
  }

  async deleteMenu(key, ifMatch, { actorId, ip, request_id }) {
    const existing = await this.repo.getMenuByKey(key)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        problem: problemPayload({
          type: this.types.userNotFound,
          title: 'Not Found',
          status: 404,
          detail: 'Menu node not found.',
          code: 'AUTH_MENU_NOT_FOUND'
        })
      }
    }

    // Optimistic locking
    const currentEtag = existing.upd_date ? existing.upd_date.toISOString() : ''
    if (!ifMatch || currentEtag !== ifMatch) {
      return {
        ok: false,
        status: 412,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Precondition Failed',
          status: 412,
          detail: 'Precondition failed (If-Match mismatch).',
          code: 'AUTH_PRECONDITION_FAILED'
        })
      }
    }

    // Self-Lockout Prevention
    if (key === 'permissions:manage') {
      return {
        ok: false,
        status: 400,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Bad Request',
          status: 400,
          detail: 'Deletion of permissions:manage key is prohibited.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    // Check if it has children
    const childCount = await this.repo.countChildMenus(key)
    if (childCount > 0) {
      return {
        ok: false,
        status: 409,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Conflict',
          status: 409,
          detail: 'Cannot delete menu key that has children.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    // Check if directly referenced
    const isReferenced = await this.repo.isMenuReferenced(key)
    if (isReferenced) {
      return {
        ok: false,
        status: 409,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Conflict',
          status: 409,
          detail: 'Cannot delete menu key that is explicitly referenced in role permissions.',
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    // Wildcard match check: deleting this action key must not make other wildcards match zero actions
    const menus = await this.repo.getMenus()
    const rolePermissions = await this.repo.getRolePermissions()

    const simulatedMenus = menus.filter(m => m.key !== key)
    const errors = validateSeedData({ menus: simulatedMenus, rolePermissions })
    if (errors.length > 0) {
      return {
        ok: false,
        status: 409,
        problem: problemPayload({
          type: this.types.validation,
          title: 'Conflict',
          status: 409,
          detail: `Cannot delete action: ${errors.join(', ')}`,
          code: 'AUTH_INVALID_REQUEST'
        })
      }
    }

    await this.repo.deleteMenu(key)

    await this.audit({
      event_type: 'auth.permissions_changed',
      outcome: 'success',
      request_id,
      user_id: actorId,
      ip,
      detail_safe: { action: 'delete_menu', key }
    })

    return { ok: true, status: 204 }
  }

  async getRolePermissions(ou_id, role) {
    const parsedOuId = ou_id === 'null' ? null : ou_id
    const filter = {}
    if (parsedOuId !== undefined) filter.ou_id = parsedOuId
    if (role !== undefined) filter.role = role

    const list = await this.repo.getRolePermissions(filter)
    return { ok: true, status: 200, body: { role_permissions: list } }
  }

  async upsertRolePermission(ouIdParam, role, menu_keys, revoke_sessions, { actorId, ip, request_id }) {
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
      const hasManage = menu_keys.includes('permissions:manage') || menu_keys.includes('permissions:*')
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
    const simulatedMappings = rolePermissions.filter(rp => !(rp.ou_id === ouId && rp.role === role))
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
      const bumpRes = await this.repo.bumpUsersTokenGen(ouId, role)

      // Revoke in MongoDB: refresh tokens for those users
      const users = await this.repo.getUsersInScope(ouId, role)
      const userIds = users.map(u => u._id)
      if (userIds.length > 0) {
        await this.repo.db.collection(AUTH_COLLECTIONS.REFRESH_TOKENS).updateMany(
          { user_id: { $in: userIds }, revoked_at: null },
          { $set: { revoked_at: now } }
        )
      }

      // Sync Redis with pipeline in chunks
      if (this.redisClient && users.length > 0) {
        const ttl = (this.env.REFRESH_TOKEN_TTL_SECONDS ?? 0) + (this.env.ACCESS_TOKEN_TTL_SECONDS ?? 0)
        
        // chunking to avoid blocking redis
        const chunkSize = 1000
        for (let i = 0; i < users.length; i += chunkSize) {
          const chunk = users.slice(i, i + chunkSize)
          const pipeline = this.redisClient.multi()
          
          for (const user of chunk) {
            const user_id_hex = user._id.toHexString()
            const redisKey = `auth:token_gen:${user_id_hex}`
            // Read fresh user gen if needed, or query again
            const dbUser = await this.repo.db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: user._id })
            const gen = dbUser ? (dbUser.access_token_gen ?? 0) : 1
            
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
  }

  async deleteRolePermission(ouIdParam, role, { actorId, ip, request_id }) {
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

    const existing = await this.repo.getRolePermissionByPair(ouId, role)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        problem: problemPayload({
          type: this.types.userNotFound,
          title: 'Not Found',
          status: 404,
          detail: 'Role permission mapping not found.',
          code: 'AUTH_ROLE_PERMISSION_NOT_FOUND'
        })
      }
    }

    // Self-Lockout Prevention: ห้ามลบ platform_admin mapping
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
