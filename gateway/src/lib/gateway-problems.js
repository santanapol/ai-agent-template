import { problemPayload } from './problem.js'

/**
 * @typedef {'gatewayJwt' | 'gatewayClaim' | 'gatewayUpstream' | 'gatewayRoute' | 'gatewayNotReady'} GatewayProblemTypeKey
 */

/**
 * @type {Record<string, { status: number, title: string, typeKey: GatewayProblemTypeKey }>}
 */
export const GATEWAY_ERROR_DEF = {
  GATEWAY_JWT_MISSING: {
    status: 401,
    title: 'Authentication required',
    typeKey: 'gatewayJwt'
  },
  GATEWAY_JWT_REJECTED: {
    status: 401,
    title: 'Authentication failed',
    typeKey: 'gatewayJwt'
  },
  GATEWAY_CLAIM_REJECTED: {
    status: 401,
    title: 'Invalid authentication token',
    typeKey: 'gatewayClaim'
  },
  GATEWAY_UPSTREAM_UNAVAILABLE: {
    status: 502,
    title: 'Upstream service is unavailable',
    typeKey: 'gatewayUpstream'
  },
  GATEWAY_UPSTREAM_TIMEOUT: {
    status: 504,
    title: 'Upstream request timed out',
    typeKey: 'gatewayUpstream'
  },
  GATEWAY_ROUTE_NOT_CONFIGURED: {
    status: 502,
    title: 'Gateway routing is misconfigured',
    typeKey: 'gatewayRoute'
  },
  GATEWAY_ROUTE_NOT_FOUND: {
    status: 404,
    title: 'Route not found',
    typeKey: 'gatewayRoute'
  },
  GATEWAY_NOT_READY: {
    status: 503,
    title: 'Gateway is not ready',
    typeKey: 'gatewayNotReady'
  }
}

/**
 * @param {import('fastify').FastifyReply} reply
 * @param {ReturnType<typeof import('./problem.js').problemTypes>} types
 * @param {keyof typeof GATEWAY_ERROR_DEF} codeKey
 * @param {{ detail?: string }} [opts]
 */
export function sendGatewayProblem(reply, types, codeKey, opts = {}) {
  const def = GATEWAY_ERROR_DEF[codeKey]
  if (!def) {
    throw new Error(`Unknown gateway problem code: ${String(codeKey)}`)
  }
  const typeUri = types[def.typeKey]
  const payload = problemPayload({
    type: typeUri,
    title: def.title,
    status: def.status,
    detail: opts.detail,
    code: codeKey
  })
  return reply.code(def.status).type('application/problem+json').send(payload)
}
