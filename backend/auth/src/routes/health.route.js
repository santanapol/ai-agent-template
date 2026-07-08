import { problemPayload } from '../lib/problem.js'

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{
 *   startedAtMs: number
 *   types: ReturnType<import('../lib/problem.js').problemTypes>
 *   redisClient?: { ping?: () => Promise<string> } | null
 *   branchReadDb?: { ping: () => Promise<unknown> } | null
 * }} opts
 */
export async function registerHealthRoutes(app, opts) {
  const { startedAtMs, types, redisClient = null, branchReadDb = null } = opts

  app.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAtMs) / 1000)
  }))

  app.get('/readyz', async (_request, reply) => {
    try {
      await app.mongo.db.admin().command({ ping: 1 })
      const dependencies = [{ name: 'mongodb', status: 'ok' }]
      if (redisClient) {
        await redisClient.ping()
        dependencies.push({ name: 'redis', status: 'ok' })
      }
      if (branchReadDb) {
        await branchReadDb.ping()
        dependencies.push({ name: 'branch-read-mongodb', status: 'ok' })
      }
      return {
        status: 'ok',
        dependencies
      }
    } catch {
      return reply
        .code(503)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.notReady,
            title: 'Service Unavailable',
            status: 503,
            detail: 'Readiness check failed.',
            code: 'AUTH_NOT_READY'
          })
        )
    }
  })
}
