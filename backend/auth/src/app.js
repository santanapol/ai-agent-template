import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import mongoPlugin from './plugins/mongo.js'
import { loadEnv } from './config/env.js'
import { buildFastifyLoggerOptions } from './config/logger.js'
import { problemPayload, problemTypes } from './lib/problem.js'
import { genRequestId } from './lib/request-id.js'
import { createClient } from 'redis'
import { loadSigningMaterial, finalizeJwk } from './lib/jwt-access.js'
import { AuthRepository } from './modules/auth/auth.repository.js'
import { AuthService } from './modules/auth/auth.service.js'
import { createAuthController } from './modules/auth/auth.controller.js'
import authRoutePlugin from './modules/auth/auth.route.js'
import { InternalService } from './modules/internal/internal.service.js'
import { createInternalController } from './modules/internal/internal.controller.js'
import internalRoutePlugin from './modules/internal/internal.route.js'
import { AdminRepository } from './modules/admin/admin.repository.js'
import { AdminService } from './modules/admin/admin.service.js'
import { createAdminController } from './modules/admin/admin.controller.js'
import adminRoutePlugin from './modules/admin/admin.route.js'
import { BranchReadDb } from './config/branch-read-db.js'
import { BranchReadRepository } from './modules/auth/branch-read.repository.js'

/**
 * @param {ReturnType<typeof loadEnv>} [env]
 * @param {{
 *   logger?: boolean
 *   redisClient?: import('redis').RedisClientType | { get: (k: string) => Promise<string | null>, set: (k: string, v: string) => Promise<unknown>, ping?: () => Promise<string> } | null
 *   branchReadRepo?: import('./modules/auth/branch-read.repository.js').BranchReadRepository | null
 * }} [options]
 */
export async function buildApp(env = loadEnv(), options = {}) {
  const types = problemTypes(env.PROBLEM_TYPE_BASE)
  const fastify = Fastify({
    logger: options.logger === false ? false : buildFastifyLoggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    genReqId: genRequestId,
    requestIdHeader: 'x-request-id'
  })
  fastify.decorate('problemTypes', types)

  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id)
    return payload
  })

  // [Forbidden] Duplicate Headers check (api.md § 3.1)
  fastify.addHook('onRequest', async (request, reply) => {
    const forbiddenDuplicates = [
      'x-gateway-secret',
      'x-user-ou',
      'x-user-branch',
      'x-user-home-branch',
      'x-user-id',
      'x-user-role',
      'x-user-permissions',
      'x-request-id'
    ]
    for (const header of forbiddenDuplicates) {
      const value = request.headers[header]
      if (Array.isArray(value)) {
        return reply
          .code(400)
          .type('application/problem+json')
          .send(
            problemPayload({
              type: types.validation,
              title: 'Bad Request',
              status: 400,
              detail: `Duplicate header not allowed: ${header}`,
              code: 'AUTH_INVALID_REQUEST'
            })
          )
      }
    }
  })

  fastify.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      // Check for password policy violation
      const isPasswordPolicy = error.validation.some(
        (v) =>
          (v.instancePath === '/new_password' || v.instancePath === '/password') &&
          (v.keyword === 'minLength' || v.keyword === 'maxLength' || v.keyword === 'pattern')
      )

      if (isPasswordPolicy) {
        return reply
          .code(400)
          .type('application/problem+json')
          .send(
            problemPayload({
              type: types.passwordPolicyViolation,
              title: 'Bad Request',
              status: 400,
              detail: 'Password does not meet policy requirements.',
              code: 'AUTH_PASSWORD_POLICY_VIOLATION'
            })
          )
      }

      return reply
        .code(400)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.validation,
            title: 'Bad Request',
            status: 400,
            detail: 'Request body failed validation.',
            code: 'AUTH_INVALID_REQUEST'
          })
        )
    }
    request.log.error(error)
    return reply.send(error)
  })

  await fastify.register(cookie)

  const corsOrigins = String(env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (corsOrigins.length > 0) {
    await fastify.register(cors, { origin: corsOrigins, credentials: true })
  }

  await fastify.register(mongoPlugin, { uri: env.DATABASE_URI })

  const serviceLog =
    options.logger === false ? { warn: () => {}, error: () => {}, info: () => {} } : fastify.log

  /** @type {import('redis').RedisClientType | { get: (k: string) => Promise<string | null>, set: (k: string, v: string) => Promise<unknown>, ping?: () => Promise<string> } | null} */
  let redisClient = options.redisClient ?? null
  const redisUrl = String(env.REDIS_URL ?? '').trim()
  if (!redisClient && redisUrl) {
    redisClient = createClient({ url: redisUrl })
    redisClient.on('error', (err) => {
      serviceLog.error({ err }, 'Redis client error')
    })
    await redisClient.connect()
    fastify.addHook('onClose', async () => {
      if (redisClient?.isOpen) {
        await redisClient.quit().catch(() => {})
      }
    })
  }

  /** @type {import('./modules/auth/branch-read.repository.js').BranchReadRepository | null} */
  let branchReadRepo = options.branchReadRepo ?? null
  /** @type {BranchReadDb | null} */
  let branchReadDb = null
  const branchReadUri = String(env.MONGODB_URI_READ ?? '').trim()
  if (!branchReadRepo && branchReadUri) {
    branchReadDb = new BranchReadDb({
      uri: branchReadUri,
      dbName: env.MONGODB_DB_BRANCH
    })
    await branchReadDb.connect()
    branchReadRepo = new BranchReadRepository(branchReadDb.getDb())
    fastify.addHook('onClose', async () => {
      await branchReadDb?.close()
    })
  }

  const startedAtMs = Date.now()
  fastify.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAtMs) / 1000)
  }))

  fastify.get('/readyz', async (_request, reply) => {
    try {
      await fastify.mongo.db.admin().command({ ping: 1 })
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

  const { privateKey, publicKey, jwk } = await loadSigningMaterial(env.JWT_PRIVATE_KEY_PEM)
  const jwkPublic = finalizeJwk(jwk, env.JWT_KID)
  fastify.decorate('jwksDocument', { keys: [jwkPublic] })

  const repo = new AuthRepository(fastify.mongo.db)

  const service = new AuthService({
    env,
    repo,
    mongoClient: fastify.mongo.client,
    privateKey,
    types,
    redisClient,
    branchReadRepo,
    log: serviceLog
  })
  const controller = createAuthController({ service, env, types })

  fastify.get('/.well-known/jwks.json', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=300')
    return fastify.jwksDocument
  })

  await fastify.register(authRoutePlugin, { controller, types, env, publicKey })

  const adminRepo = new AdminRepository(fastify.mongo.db)
  const adminService = new AdminService({
    repo: adminRepo,
    env,
    redisClient,
    log: serviceLog,
    types
  })
  const adminController = createAdminController({ service: adminService, types })
  await fastify.register(adminRoutePlugin, {
    controller: adminController,
    authService: service,
    types,
    env,
    publicKey
  })

  const internalService = new InternalService({ authService: service })
  const internalController = createInternalController({ service: internalService })
  await fastify.register(internalRoutePlugin, {
    controller: internalController,
    types,
    env
  })

  return fastify
}
