import { validateSeedData } from '../../lib/permission-validation.js'
import { problemPayload } from '../../lib/problem.js'

export const adminMenusMixin = {
  async getMenus() {
    const menus = await this.repo.getMenus()
    return { ok: true, status: 200, body: { menus } }
  },

  async createMenu(doc, { actorId, ip, request_id }) {
    const menus = await this.repo.getMenus()
    const rolePermissions = await this.repo.getRolePermissions()

    // Simulate adding the new menu item to validate
    const simulatedMenus = [
      ...menus,
      {
        ...doc,
        ou_id: null,
        cr_by: actorId,
        cr_date: new Date(),
        cr_prog: 'POST /auth/admin/menus',
        upd_by: actorId,
        upd_date: new Date(),
        upd_prog: 'POST /auth/admin/menus'
      }
    ]

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
  },

  async updateMenu(key, doc, ifMatch, { actorId, ip, request_id }) {
    const existing = await this.repo.getMenuByKey(key)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        problem: problemPayload({
          type: this.types.menuNotFound,
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
          type: this.types.preconditionFailed,
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
    const simulatedMenus = menus.map((m) => (m.key === key ? { ...m, ...doc } : m))
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

    const result = await this.repo.updateMenu(key, updateDoc, existing.upd_date)
    if (result.matchedCount === 0) {
      return {
        ok: false,
        status: 412,
        problem: problemPayload({
          type: this.types.preconditionFailed,
          title: 'Precondition Failed',
          status: 412,
          detail: 'Resource was modified by another request. Refresh and retry.',
          code: 'AUTH_PRECONDITION_FAILED'
        })
      }
    }

    await this.audit({
      event_type: 'auth.permissions_changed',
      outcome: 'success',
      request_id,
      user_id: actorId,
      ip,
      detail_safe: { action: 'update_menu', key }
    })

    return { ok: true, status: 200, body: { ...existing, ...updateDoc } }
  },

  async deleteMenu(key, ifMatch, { actorId, ip, request_id }) {
    const existing = await this.repo.getMenuByKey(key)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        problem: problemPayload({
          type: this.types.menuNotFound,
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
          type: this.types.preconditionFailed,
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
          code: 'AUTH_MENU_IN_USE'
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
          code: 'AUTH_MENU_IN_USE'
        })
      }
    }

    // Wildcard match check: deleting this action key must not make other wildcards match zero actions
    const menus = await this.repo.getMenus()
    const rolePermissions = await this.repo.getRolePermissions()

    const simulatedMenus = menus.filter((m) => m.key !== key)
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
          code: 'AUTH_MENU_IN_USE'
        })
      }
    }

    const result = await this.repo.deleteMenu(key, existing.upd_date)
    if (result.deletedCount === 0) {
      return {
        ok: false,
        status: 412,
        problem: problemPayload({
          type: this.types.preconditionFailed,
          title: 'Precondition Failed',
          status: 412,
          detail: 'Resource was modified by another request. Refresh and retry.',
          code: 'AUTH_PRECONDITION_FAILED'
        })
      }
    }

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
}
