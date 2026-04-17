import rateLimit from '@fastify/rate-limit'

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ controller: ReturnType<typeof import('./auth.controller.js').createAuthController>, types: Record<string, string> }} opts
 */
export default async function authRoutePlugin (fastify, opts) {
  const { controller, types } = opts

  await fastify.register(async (scope) => {
    await scope.register(rateLimit, {
      global: true,
      max: 60,
      timeWindow: '1 minute',
      errorResponseBuilder: (_req, context) => ({
        type: types.rateLimit,
        title: 'Too Many Requests',
        status: 429,
        detail: `Rate limit exceeded, retry in ${context.ttl} seconds.`
      })
    })

    scope.post('/auth/login', (request, reply) => controller.login(request, reply))
    scope.post('/auth/refresh', (request, reply) => controller.refresh(request, reply))
    scope.post('/auth/logout', (request, reply) => controller.logout(request, reply))
  })
}
