export function createAdminController({ service }) {
  const getContext = (request) => ({
    actorId: request.accessSub,
    ip: request.ip,
    request_id: request.id
  })

  return {
    async getMenus(request, reply) {
      const result = await service.getMenus()
      return reply.code(result.status).send(result.body)
    },

    async createMenu(request, reply) {
      const ctx = getContext(request)
      const result = await service.createMenu(request.body, ctx)
      if (!result.ok) {
        return reply.code(result.status).type('application/problem+json').send(result.problem)
      }
      return reply.code(result.status).send(result.body)
    },

    async updateMenu(request, reply) {
      const ctx = getContext(request)
      const { key } = request.params
      const ifMatch = request.headers['if-match']
      const result = await service.updateMenu(key, request.body, ifMatch, ctx)
      if (!result.ok) {
        return reply.code(result.status).type('application/problem+json').send(result.problem)
      }
      return reply.code(result.status).send(result.body)
    },

    async deleteMenu(request, reply) {
      const ctx = getContext(request)
      const { key } = request.params
      const ifMatch = request.headers['if-match']
      const result = await service.deleteMenu(key, ifMatch, ctx)
      if (!result.ok) {
        return reply.code(result.status).type('application/problem+json').send(result.problem)
      }
      return reply.code(result.status).send()
    },

    async getRolePermissions(request, reply) {
      const { ou_id, role } = request.query
      const result = await service.getRolePermissions(ou_id, role)
      return reply.code(result.status).send(result.body)
    },

    async upsertRolePermission(request, reply) {
      const ctx = getContext(request)
      const { ou_id, role } = request.params
      const { menu_keys, revoke_sessions } = request.body
      const result = await service.upsertRolePermission(
        ou_id,
        role,
        menu_keys,
        revoke_sessions,
        ctx
      )
      if (!result.ok) {
        return reply.code(result.status).type('application/problem+json').send(result.problem)
      }
      return reply.code(result.status).send(result.body)
    },

    async deleteRolePermission(request, reply) {
      const ctx = getContext(request)
      const { ou_id, role } = request.params
      const { confirm } = request.query || {}
      const result = await service.deleteRolePermission(ou_id, role, confirm, ctx)
      if (!result.ok) {
        return reply.code(result.status).type('application/problem+json').send(result.problem)
      }
      return reply.code(result.status).send()
    }
  }
}
