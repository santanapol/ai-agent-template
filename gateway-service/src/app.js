import Fastify from 'fastify'
import cors from '@fastify/cors'
import { buildFastifyLoggerOptions } from './config/logger.js'
import { loadEnv } from './config/env.js'
import { loadRoutes } from './config/routes.js'
import { mapGatewayClientStatus } from './lib/errors.js'
import jwtAuthPlugin from './plugins/jwt-auth.js'
import injectContextPlugin from './plugins/inject-context.js'
import { registerProxies } from './proxy/register-proxies.js'

/**
 * @param {ReturnType<typeof loadEnv>} [env]
 * @param {{ logger?: boolean }} [options]
 */
export async function buildApp (env = loadEnv(), options = {}) {
  const routes = loadRoutes(env)

  const fastify = Fastify({
    logger: options.logger === false ? false : buildFastifyLoggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: env.MAX_BODY_BYTES
  })

  fastify.addHook('onSend', async (_request, reply, payload) => {
    if (!reply.getHeader('x-content-type-options')) {
      reply.header('X-Content-Type-Options', 'nosniff')
    }
    return payload
  })

  fastify.setErrorHandler((err, request, reply) => {
    const mapped = mapGatewayClientStatus(err)
    if (mapped === 502 || mapped === 504) {
      return reply.status(mapped).send()
    }
    request.log.error({ err }, 'request failed')
    const status =
      typeof err === 'object' &&
      err !== null &&
      typeof err.statusCode === 'number' &&
      err.statusCode >= 400 &&
      err.statusCode < 600
        ? err.statusCode
        : 500
    return reply.status(status).send()
  })

  const corsOrigins = String(env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (corsOrigins.length > 0) {
    await fastify.register(cors, { origin: corsOrigins })
  }

  await fastify.register(jwtAuthPlugin, { env })
  await fastify.register(injectContextPlugin, { env })

  fastify.get('/health', async () => ({ status: 'ok' }))

  await registerProxies(fastify, { env, routes })

  return fastify
}
