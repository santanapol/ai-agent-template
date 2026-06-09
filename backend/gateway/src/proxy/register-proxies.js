import httpProxy from '@fastify/http-proxy'

const DANGEROUS_HEADERS = new Set([
  'authorization',
  'x-user-id',
  'x-user-role',
  'x-user-ou',
  'x-user-branch',
  'x-gateway-secret',
  'if-match',
  'x-request-id'
])

/**
 * @param {Record<string, string | string[] | undefined>} headers
 */
function stripDangerousInboundHeaders(headers) {
  const out = { ...headers }
  for (const key of Object.keys(out)) {
    if (DANGEROUS_HEADERS.has(key.toLowerCase())) {
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

  const replyOptions = {
    timeout: env.UPSTREAM_TIMEOUT_MS,
    rewriteRequestHeaders: (originalReq, headers) => {
      const base = stripDangerousInboundHeaders(headers)
      const ctx = originalReq.gatewayUpstreamHeaders
      if (!ctx) {
        return base
      }
      const trustedHeaders = {
        'x-gateway-secret': ctx['x-gateway-secret'],
        'x-user-ou': ctx['x-user-ou'],
        'x-user-branch': ctx['x-user-branch'],
        'x-user-id': ctx['x-user-id'],
        'x-user-role': ctx['x-user-role'],
        ...(ctx['if-match'] ? { 'if-match': ctx['if-match'] } : {}),
        'x-request-id': ctx['x-request-id']
      }
      return {
        ...base,
        ...trustedHeaders
      }
    }
  }

  for (const route of routes) {
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
