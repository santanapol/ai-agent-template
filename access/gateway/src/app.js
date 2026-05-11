import Fastify from 'fastify'
import cors from '@fastify/cors'
import { buildFastifyLoggerOptions } from './config/logger.js'
import { loadEnv } from './config/env.js'
import { loadRoutes } from './config/routes.js'
import { mapGatewayClientStatus } from './lib/errors.js'
import { problemTypes } from './lib/problem.js'
import { sendGatewayProblem } from './lib/gateway-problems.js'
import jwtAuthPlugin from './plugins/jwt-auth.js'
import injectContextPlugin from './plugins/inject-context.js'
import { registerProxies } from './proxy/register-proxies.js'

const TRUSTED_HEADER_KEYS = [
  'x-gateway-secret',
  'x-user-ou',
  'x-user-branch',
  'x-user-id',
  'x-user-role',
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
function hasDuplicateHeader (raw, headers, headerName) {
  const distinct = /** @type {Record<string, unknown> | undefined} */ (raw.headersDistinct)
  if (distinct && Array.isArray(distinct[headerName]) && distinct[headerName].length > 1) {
    return true
  }
  return Array.isArray(headers[headerName]) && headers[headerName].length > 1
}

/**
 * @param {ReturnType<typeof loadEnv>} [env]
 * @param {{ logger?: boolean }} [options]
 */
export async function buildApp (env = loadEnv(), options = {}) {
  const routes = loadRoutes(env)
  const startedAtMs = Date.now()

  const fastify = Fastify({
    logger: options.logger === false ? false : buildFastifyLoggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: env.MAX_BODY_BYTES
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
    send (reply, codeKey, opts) {
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

  fastify.addHook('onSend', async (_request, reply, payload) => {
    if (!reply.getHeader('x-content-type-options')) {
      reply.header('X-Content-Type-Options', 'nosniff')
    }
    return payload
  })

  fastify.setErrorHandler((err, request, reply) => {
    const mapped = mapGatewayClientStatus(err)
    if (mapped === 502) {
      return fastify.gatewayProblem.send(reply, 'GATEWAY_UPSTREAM_UNAVAILABLE')
    }
    if (mapped === 504) {
      return fastify.gatewayProblem.send(reply, 'GATEWAY_UPSTREAM_TIMEOUT')
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

  fastify.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAtMs) / 1000)
  }))

  fastify.get('/readyz', async (request, reply) => {
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
      return fastify.gatewayProblem.send(reply, 'GATEWAY_NOT_READY', {
        detail: 'Readiness check failed: JWKS not available.'
      })
    } finally {
      clearTimeout(timeoutId)
    }

    return {
      status: 'ok',
      dependencies: [
        { name: 'jwks', status: 'ok' },
        { name: 'routes', status: 'ok' }
      ]
    }
  })

  await registerProxies(fastify, { env, routes })

  // Route miss fallback: respond from gateway directly so callers can distinguish
  // "hit gateway but no route matched" from upstream failures.
  fastify.setNotFoundHandler((_request, reply) => {
    reply.header('x-gateway-hit', 'true')
    return fastify.gatewayProblem.send(reply, 'GATEWAY_ROUTE_NOT_FOUND', {
      detail: 'Reached gateway, no route matched'
    })
  })

  fastify.decorate('gatewayRoutePrefixes', routes.map((r) => r.prefix))

  return fastify
}
