import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createClient } from 'redis'
import { buildFastifyLoggerOptions } from './config/logger.js'
import { loadEnv } from './config/env.js'
import { loadRoutes } from './config/routes.js'
import { mapGatewayClientStatus } from './lib/errors.js'
import { problemTypes } from './lib/problem.js'
import { sendGatewayProblem } from './lib/gateway-problems.js'
import jwtAuthPlugin from './plugins/jwt-auth.js'
import injectContextPlugin from './plugins/inject-context.js'
import { registerProxies } from './proxy/register-proxies.js'
import { upstreamProblemDetail } from './lib/upstream-problem-detail.js'
import { genRequestId } from './lib/request-id.js'
import { registerBasicMetrics } from '../../shared/fastify-metrics/basic-metrics.js'
import { registerHealthRoutes } from './routes/health.route.js'

const TRUSTED_HEADER_KEYS = [
  'x-gateway-secret',
  'x-user-ou',
  'x-user-branch',
  'x-user-home-branch',
  'x-user-id',
  'x-user-role',
  'x-user-permissions',
  'if-match',
  'x-request-id'
]

/**
 * Node exposes duplicated inbound headers via `raw.headersDistinct` (array values).
 * Fallback to `request.headers` array shape for test/inject environments.
 * @param {import('node:http').IncomingMessage} raw
 * @param {Record<string, unknown>} headers
 * @param {string} headerName
 */
function hasDuplicateHeader(raw, headers, headerName) {
  const distinct = /** @type {Record<string, unknown> | undefined} */ (raw.headersDistinct)
  if (distinct && Array.isArray(distinct[headerName]) && distinct[headerName].length > 1) {
    return true
  }
  return Array.isArray(headers[headerName]) && headers[headerName].length > 1
}

/**
 * @param {ReturnType<typeof loadEnv>} [env]
 * @param {{ logger?: boolean, redisClient?: import('redis').RedisClientType | { get: (key: string) => Promise<string | null>, ping?: () => Promise<string> } | null }} [options]
 */
export async function buildApp(env = loadEnv(), options = {}) {
  const routes = loadRoutes(env)
  const startedAtMs = Date.now()

  const fastify = Fastify({
    logger: options.logger === false ? false : buildFastifyLoggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: env.MAX_BODY_BYTES,
    genReqId: genRequestId,
    requestIdHeader: 'x-request-id'
  })

  if (options.logger !== false) {
    fastify.log.info(
      {
        prefixes: routes.map((r) => r.prefix),
        upstreamHosts: routes.map((r) => {
          try {
            return new URL(r.upstream).host
          } catch {
            return 'invalid-url'
          }
        })
      },
      'gateway proxy route table (longest-prefix match order)'
    )
  }

  const problemTypeUris = problemTypes(env.PROBLEM_TYPE_BASE)
  fastify.decorate('gatewayProblem', {
    /**
     * @param {import('fastify').FastifyReply} reply
     * @param {keyof import('./lib/gateway-problems.js').GATEWAY_ERROR_DEF} codeKey
     * @param {{ detail?: string }} [opts]
     */
    send(reply, codeKey, opts) {
      return sendGatewayProblem(reply, problemTypeUris, codeKey, opts)
    }
  })

  fastify.addHook('onRequest', async (request, reply) => {
    for (const headerName of TRUSTED_HEADER_KEYS) {
      if (hasDuplicateHeader(request.raw, request.headers, headerName)) {
        return fastify.gatewayProblem.send(reply, 'GATEWAY_CLAIM_REJECTED', {
          detail: `Duplicate header not allowed: ${headerName}`
        })
      }
    }
  })

  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id)
    if (!reply.getHeader('x-content-type-options')) {
      reply.header('X-Content-Type-Options', 'nosniff')
    }
    return payload
  })

  fastify.setErrorHandler((err, request, reply) => {
    const mapped = mapGatewayClientStatus(err)
    if (mapped === 502) {
      return fastify.gatewayProblem.send(reply, 'GATEWAY_UPSTREAM_UNAVAILABLE', {
        detail: upstreamProblemDetail(err)
      })
    }
    if (mapped === 504) {
      return fastify.gatewayProblem.send(reply, 'GATEWAY_UPSTREAM_TIMEOUT')
    }
    request.log.error({ err }, 'request failed')
    const status =
      typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500
    return reply.status(status).send()
  })

  const corsOrigins = String(env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (corsOrigins.length > 0) {
    await fastify.register(cors, { origin: corsOrigins, credentials: true })
  }

  const serviceLog =
    options.logger === false ? { warn: () => {}, error: () => {}, info: () => {} } : fastify.log

  /** @type {import('redis').RedisClientType | { get: (key: string) => Promise<string | null>, ping?: () => Promise<string> } | null} */
  let redisClient = options.redisClient ?? null
  const redisUrl = String(env.REDIS_URL ?? '').trim()
  if (!redisClient && redisUrl) {
    redisClient = createClient({ url: redisUrl })
    redisClient.on('error', (err) => {
      serviceLog.error({ err }, 'Redis client error')
    })
    await redisClient.connect()
    fastify.addHook('onClose', async () => {
      if (redisClient && 'isOpen' in redisClient && redisClient.isOpen) {
        await redisClient.quit().catch(() => {})
      }
    })
  }

  await fastify.register(jwtAuthPlugin, { env, redisClient })
  await fastify.register(injectContextPlugin, { env })

  await registerHealthRoutes(fastify, { startedAtMs, env, redisClient })
  registerBasicMetrics(fastify, { startedAtMs, serviceName: env.APP_NAME ?? 'gateway' })

  await registerProxies(fastify, { env, routes })

  // Route miss fallback: respond from gateway directly so callers can distinguish
  // "hit gateway but no route matched" from upstream failures.
  fastify.setNotFoundHandler((_request, reply) => {
    reply.header('x-gateway-hit', 'true')
    return fastify.gatewayProblem.send(reply, 'GATEWAY_ROUTE_NOT_FOUND', {
      detail: 'Reached gateway, no route matched'
    })
  })

  fastify.decorate(
    'gatewayRoutePrefixes',
    routes.map((r) => r.prefix)
  )

  return fastify
}
