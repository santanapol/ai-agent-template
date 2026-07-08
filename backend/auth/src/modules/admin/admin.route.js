import { buildRequireAccessBearer } from '../../lib/require-access-bearer.js'
import { anyPermissionMatches } from '../../lib/permission-match.js'
import { problemPayload } from '../../lib/problem.js'
import {
  menuKeyParamSchema,
  createMenuBodySchema,
  updateMenuBodySchema,
  rolePermissionParamsSchema,
  getRolePermissionsQuerySchema,
  upsertRolePermissionBodySchema,
  deleteRolePermissionQuerySchema
} from './admin.schema.js'

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{
 *   controller: ReturnType<typeof import('./admin.controller.js').createAdminController>
 *   authService: any
 *   types: Record<string, string>
 *   env: any
 *   publicKey: import('jose').KeyLike
 * }} opts
 */
export default async function adminRoutePlugin(fastify, opts) {
  const { controller, authService, types, env, publicKey } = opts

  const requireAccessBearer = buildRequireAccessBearer({ publicKey, env, types })

  const requirePermissionManage = async (request, reply) => {
    const userId = request.accessSub
    if (!userId) {
      return reply
        .code(401)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.invalidToken,
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token is missing or invalid.',
            code: 'TOKEN_REFRESH_REJECTED'
          })
        )
    }

    try {
      const genCheck = await authService.assertAccessTokenGenMatches({
        user_id_hex: userId,
        token_gen_claim: request.accessTokenGen
      })

      if (!genCheck.ok) {
        return reply
          .code(genCheck.status ?? 401)
          .type('application/problem+json')
          .send(genCheck.problem)
      }

      const user = genCheck.user
      if (!user) {
        return reply
          .code(403)
          .type('application/problem+json')
          .send(
            problemPayload({
              type: types.forbidden,
              title: 'Forbidden',
              status: 403,
              detail: 'Access denied.',
              code: 'AUTH_FORBIDDEN'
            })
          )
      }

      const permissions = await authService.resolveEffectivePermissions({
        ouId: user.ou_id ?? null,
        role: user.role
      })

      const hasPermission = anyPermissionMatches(permissions, 'permissions:manage')
      if (!hasPermission) {
        return reply
          .code(403)
          .type('application/problem+json')
          .send(
            problemPayload({
              type: types.forbidden,
              title: 'Forbidden',
              status: 403,
              detail: 'Access denied.',
              code: 'AUTH_FORBIDDEN'
            })
          )
      }
    } catch (err) {
      if (err.status === 401) {
        return reply
          .code(401)
          .type('application/problem+json')
          .send(
            problemPayload({
              type: types.invalidToken,
              title: 'Unauthorized',
              status: 401,
              detail: err.message,
              code: 'TOKEN_REFRESH_REJECTED'
            })
          )
      }
      fastify.log.error(err)
      return reply
        .code(403)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.forbidden,
            title: 'Forbidden',
            status: 403,
            detail: 'Access denied.',
            code: 'AUTH_FORBIDDEN'
          })
        )
    }
  }

  const adminGuard = [requireAccessBearer, requirePermissionManage]

  fastify.get('/auth/admin/menus', { preHandler: adminGuard }, (request, reply) =>
    controller.getMenus(request, reply)
  )

  fastify.post(
    '/auth/admin/menus',
    {
      schema: { body: createMenuBodySchema },
      preHandler: adminGuard
    },
    (request, reply) => controller.createMenu(request, reply)
  )

  fastify.patch(
    '/auth/admin/menus/:key',
    {
      schema: {
        params: menuKeyParamSchema,
        body: updateMenuBodySchema
      },
      preHandler: adminGuard
    },
    (request, reply) => controller.updateMenu(request, reply)
  )

  fastify.delete(
    '/auth/admin/menus/:key',
    {
      schema: { params: menuKeyParamSchema },
      preHandler: adminGuard
    },
    (request, reply) => controller.deleteMenu(request, reply)
  )

  fastify.get(
    '/auth/admin/role-permissions',
    {
      schema: { query: getRolePermissionsQuerySchema },
      preHandler: adminGuard
    },
    (request, reply) => controller.getRolePermissions(request, reply)
  )

  fastify.put(
    '/auth/admin/role-permissions/:ou_id/:role',
    {
      schema: {
        params: rolePermissionParamsSchema,
        body: upsertRolePermissionBodySchema
      },
      preHandler: adminGuard
    },
    (request, reply) => controller.upsertRolePermission(request, reply)
  )

  fastify.delete(
    '/auth/admin/role-permissions/:ou_id/:role',
    {
      schema: {
        params: rolePermissionParamsSchema,
        query: deleteRolePermissionQuerySchema
      },
      preHandler: adminGuard
    },
    (request, reply) => controller.deleteRolePermission(request, reply)
  )
}
