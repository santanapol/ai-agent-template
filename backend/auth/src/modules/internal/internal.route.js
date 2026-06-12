import rateLimit from '@fastify/rate-limit'
import { buildRateLimitPluginOptions } from '../../lib/rate-limit.js'
import { problemPayload } from '../../lib/problem.js'
import { constantTimeSecretEqual, extractBearerToken } from '../../lib/internal-bearer.js'
import {
  createUserBodySchema,
  revokeBodySchema,
  setPasswordBodySchema,
  setRoleBodySchema,
  userIdParamSchema
} from './internal.validator.js'

const RATE_LIMIT_INTERNAL = { max: 60, timeWindow: '1 minute' }

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{
 *   controller: ReturnType<typeof import('./internal.controller.js').createInternalController>
 *   types: Record<string, string>
 *   env: { AUTH_INTERNAL_SERVICE_SECRET: string }
 * }} opts
 */
export default async function internalRoutePlugin(fastify, opts) {
  const { controller, types, env } = opts

  const requireInternalBearer = async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization)
    if (!token || !constantTimeSecretEqual(token, env.AUTH_INTERNAL_SERVICE_SECRET)) {
      return reply
        .code(401)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.internalUnauthorized,
            title: 'Unauthorized',
            status: 401,
            detail: 'Internal service authentication failed.',
            code: 'AUTH_INTERNAL_UNAUTHORIZED'
          })
        )
    }
  }

  await fastify.register(async (scope) => {
    await scope.register(rateLimit, buildRateLimitPluginOptions(types))

    scope.addHook('preHandler', requireInternalBearer)

    scope.post(
      '/internal/users',
      { schema: { body: createUserBodySchema }, config: { rateLimit: RATE_LIMIT_INTERNAL } },
      (request, reply) => controller.createUser(request, reply)
    )

    scope.post(
      '/internal/users/:user_id/password',
      {
        schema: { params: userIdParamSchema, body: setPasswordBodySchema },
        config: { rateLimit: RATE_LIMIT_INTERNAL }
      },
      (request, reply) => controller.setPassword(request, reply)
    )

    scope.post(
      '/internal/users/:user_id/sessions/revoke',
      {
        schema: { params: userIdParamSchema, body: revokeBodySchema },
        config: { rateLimit: RATE_LIMIT_INTERNAL }
      },
      (request, reply) => controller.revokeSessions(request, reply)
    )

    scope.patch(
      '/internal/users/:user_id/role',
      {
        schema: { params: userIdParamSchema, body: setRoleBodySchema },
        config: { rateLimit: RATE_LIMIT_INTERNAL }
      },
      (request, reply) => controller.setRole(request, reply)
    )
  })
}
