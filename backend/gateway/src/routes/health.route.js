/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{
 *   startedAtMs: number
 *   env: ReturnType<import('../config/env.js').loadEnv>
 *   redisClient?: { ping?: () => Promise<string> } | null
 * }} opts
 */
export async function registerHealthRoutes(app, opts) {
  const { startedAtMs, env, redisClient = null } = opts

  app.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAtMs) / 1000)
  }))

  app.get('/readyz', async (request, reply) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), env.READY_CHECK_TIMEOUT_MS)
    try {
      const res = await fetch(env.JWT_JWKS_URL, {
        method: 'GET',
        signal: controller.signal,
        headers: { accept: 'application/json' }
      })
      if (!res.ok) {
        throw new Error(`jwks http ${res.status}`)
      }
      const json = /** @type {unknown} */ (await res.json())
      if (
        !json ||
        typeof json !== 'object' ||
        !('keys' in json) ||
        !Array.isArray(/** @type {{ keys?: unknown }} */ (json).keys)
      ) {
        throw new Error('invalid jwks document')
      }
    } catch (err) {
      request.log.warn({ err }, 'readyz: jwks check failed')
      return app.gatewayProblem.send(reply, 'GATEWAY_NOT_READY', {
        detail: 'Readiness check failed: JWKS not available.'
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const dependencies = [
      { name: 'jwks', status: 'ok' },
      { name: 'routes', status: 'ok' }
    ]

    if (redisClient) {
      try {
        await redisClient.ping()
        dependencies.push({ name: 'redis', status: 'ok' })
      } catch (err) {
        request.log.warn({ err }, 'readyz: redis ping failed')
        return app.gatewayProblem.send(reply, 'GATEWAY_NOT_READY', {
          detail: 'Readiness check failed: Redis not available.'
        })
      }
    }

    return {
      status: 'ok',
      dependencies
    }
  })
}
