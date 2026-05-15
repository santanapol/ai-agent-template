import rateLimit from '@fastify/rate-limit'
import { problemPayload } from '../../lib/problem.js'
import { constantTimeSecretEqual, extractBearerToken } from '../../lib/internal-bearer.js'

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
    await scope.register(rateLimit, {
      global: false,
      errorResponseBuilder: (_req, context) =>
        problemPayload({
          type: types.rateLimit,
          title: 'Too Many Requests',
          status: 429,
          detail: `Rate limit exceeded, retry in ${context.ttl} seconds.`,
          code: 'AUTH_TOO_MANY_ATTEMPTS'
        })
    })

    scope.addHook('preHandler', requireInternalBearer)

    scope.post(
      '/internal/users/:user_id/sessions/revoke',
      { config: { rateLimit: RATE_LIMIT_INTERNAL } },
      (request, reply) => controller.revokeSessions(request, reply)
    )
  })
}
