import rateLimit from '@fastify/rate-limit'
import { problemPayload } from '../../lib/problem.js'

/** Per-route caps (per IP) — สอดคล้อง `_coding-standards/auth/api.md` (default แนะนำ) */
const RATE_LIMIT_LOGIN = { max: 30, timeWindow: '1 minute' }
const RATE_LIMIT_REFRESH = { max: 120, timeWindow: '1 minute' }
const RATE_LIMIT_LOGOUT = { max: 60, timeWindow: '1 minute' }

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ controller: ReturnType<typeof import('./auth.controller.js').createAuthController>, types: Record<string, string> }} opts
 */
export default async function authRoutePlugin (fastify, opts) {
  const { controller, types } = opts

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

    scope.post(
      '/auth/login',
      { config: { rateLimit: RATE_LIMIT_LOGIN } },
      (request, reply) => controller.login(request, reply)
    )
    scope.post(
      '/auth/refresh',
      { config: { rateLimit: RATE_LIMIT_REFRESH } },
      (request, reply) => controller.refresh(request, reply)
    )
    scope.post(
      '/auth/logout',
      { config: { rateLimit: RATE_LIMIT_LOGOUT } },
      (request, reply) => controller.logout(request, reply)
    )
  })
}
