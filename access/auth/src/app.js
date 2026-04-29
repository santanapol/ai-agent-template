import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import mongoPlugin from './plugins/mongo.js'
import { loadEnv } from './config/env.js'
import { buildFastifyLoggerOptions } from './config/logger.js'
import { problemPayload, problemTypes } from './lib/problem.js'
import { loadSigningMaterial, finalizeJwk } from './lib/jwt-access.js'
import { AuthRepository } from './modules/auth/auth.repository.js'
import { AuthService } from './modules/auth/auth.service.js'
import { createAuthController } from './modules/auth/auth.controller.js'
import authRoutePlugin from './modules/auth/auth.route.js'

/**
 * @param {ReturnType<typeof loadEnv>} [env]
 * @param {{ logger?: boolean }} [options]
 */
export async function buildApp(env = loadEnv(), options = {}) {
  const types = problemTypes(env.PROBLEM_TYPE_BASE)
  const fastify = Fastify({
    logger: options.logger === false ? false : buildFastifyLoggerOptions(env),
    trustProxy: env.TRUST_PROXY
  })
  fastify.decorate('problemTypes', types)

  await fastify.register(cookie)

  const corsOrigins = String(env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (corsOrigins.length > 0) {
    await fastify.register(cors, { origin: corsOrigins, credentials: true })
  }

  await fastify.register(mongoPlugin, { uri: env.DATABASE_URI })

  const startedAtMs = Date.now()
  fastify.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAtMs) / 1000)
  }))

  fastify.get('/readyz', async (_request, reply) => {
    try {
      await fastify.mongo.db.admin().command({ ping: 1 })
      return {
        status: 'ok',
        dependencies: [{ name: 'mongodb', status: 'ok' }]
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

  const { privateKey, jwk } = await loadSigningMaterial(env.JWT_PRIVATE_KEY_PEM)
  const jwkPublic = finalizeJwk(jwk, env.JWT_KID)
  fastify.decorate('jwksDocument', { keys: [jwkPublic] })

  const repo = new AuthRepository(fastify.mongo.db)
  const service = new AuthService({
    env,
    repo,
    mongoClient: fastify.mongo.client,
    privateKey,
    types
  })
  const controller = createAuthController({ service, env, types })

  fastify.get('/.well-known/jwks.json', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=300')
    return fastify.jwksDocument
  })

  await fastify.register(authRoutePlugin, { controller, types })

  return fastify
}
