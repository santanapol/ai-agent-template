import httpProxy from '@fastify/http-proxy'

const DANGEROUS_HEADERS = new Set([
  'authorization',
  'x-user-id',
  'x-user-role',
  'x-user-permissions',
  'x-user-ou',
  'x-user-branch',
  'x-user-home-branch',
  'x-gateway-secret',
  'if-match',
  'x-request-id'
])

/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {{ preserveAuthorization?: boolean }} [opts]
 */
function stripDangerousInboundHeaders(headers, { preserveAuthorization = false } = {}) {
  const out = { ...headers }
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase()
    if (preserveAuthorization && lower === 'authorization') continue
    if (DANGEROUS_HEADERS.has(lower)) {
      delete out[key]
    }
  }
  return out
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ env: ReturnType<import('../config/env.js').loadEnv>, routes: ReturnType<import('../config/routes.js').loadRoutes> }} opts
 */
export async function registerProxies(fastify, opts) {
  const { env, routes } = opts

  for (const route of routes) {
    const preserveAuthorization = route.isPublic === true
    const replyOptions = {
      timeout: env.UPSTREAM_TIMEOUT_MS,
      rewriteRequestHeaders: (originalReq, headers) => {
        const base = stripDangerousInboundHeaders(headers, { preserveAuthorization })
        const ctx = originalReq.gatewayUpstreamHeaders
        if (!ctx) {
          return base
        }
        const trustedHeaders = {
          'x-gateway-secret': ctx['x-gateway-secret'],
          'x-user-ou': ctx['x-user-ou'],
          'x-user-branch': ctx['x-user-branch'],
          ...(ctx['x-user-home-branch'] ? { 'x-user-home-branch': ctx['x-user-home-branch'] } : {}),
          'x-user-id': ctx['x-user-id'],
          'x-user-role': ctx['x-user-role'],
          'x-user-permissions': ctx['x-user-permissions'],
          ...(ctx['if-match'] ? { 'if-match': ctx['if-match'] } : {}),
          'x-request-id': ctx['x-request-id']
        }
        return {
          ...base,
          ...trustedHeaders
        }
      }
    }

    const proxyOpts = {
      upstream: route.upstream,
      prefix: route.prefix,
      http2: false,
      replyOptions,
      preHandler: route.isPublic ? [] : [fastify.verifyJwt, fastify.injectContext]
    }
    if (!route.stripPrefix) {
      proxyOpts.rewritePrefix = route.prefix
    }
    await fastify.register(httpProxy, proxyOpts)
  }
}
