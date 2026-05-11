import httpProxy from '@fastify/http-proxy'

/**
 * @param {Record<string, string | string[] | undefined>} headers
 */
function stripDangerousInboundHeaders (headers) {
  const out = { ...headers }
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase()
    if (lower === 'authorization') delete out[key]
    if (lower === 'x-user-id') delete out[key]
    if (lower === 'x-user-role') delete out[key]
    if (lower === 'x-user-ou') delete out[key]
    if (lower === 'x-user-branch') delete out[key]
    if (lower === 'x-gateway-secret') delete out[key]
    if (lower === 'if-match') delete out[key]
    if (lower === 'x-request-id') delete out[key]
  }
  return out
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ env: ReturnType<import('../config/env.js').loadEnv>, routes: ReturnType<import('../config/routes.js').loadRoutes> }} opts
 */
export async function registerProxies (fastify, opts) {
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
        ...(ctx['x-user-ou'] ? { 'x-user-ou': ctx['x-user-ou'] } : {}),
        ...(ctx['x-user-branch'] ? { 'x-user-branch': ctx['x-user-branch'] } : {}),
        'x-user-id': ctx['x-user-id'],
        'x-user-role': ctx['x-user-role'],
        ...(ctx['if-match'] ? { 'if-match': ctx['if-match'] } : {}),
        'x-request-id': ctx['x-request-id']
      }
      return {
        ...trustedHeaders,
        ...base
      }
    }
  }

  for (const route of routes) {
    const proxyOpts = {
      upstream: route.upstream,
      prefix: route.prefix,
      http2: false,
      replyOptions,
      preHandler: [fastify.verifyJwt, fastify.injectContext]
    }
    if (!route.stripPrefix) {
      proxyOpts.rewritePrefix = route.prefix
    }
    await fastify.register(httpProxy, proxyOpts)
  }
}
