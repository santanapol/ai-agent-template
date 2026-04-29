import fp from 'fastify-plugin'
import { randomUUID } from 'node:crypto'
import {
  assertValidRoleHeader,
  assertValidUserIdHeader,
  normalizeRoleHeader,
  normalizeUserIdClaim,
  normalizeTenantClaim
} from '../lib/claims.js'

/**
 * @typedef {{ env: ReturnType<import('../config/env.js').loadEnv> }} InjectContextOptions
 */

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {InjectContextOptions} opts
   */
  async function injectContextPlugin (fastify, opts) {
    const { env } = opts

    fastify.decorate(
      'injectContext',
      async function injectContext (request, reply) {
        const payload = request.jwtPayload
        if (!payload || typeof payload !== 'object') {
          return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED')
        }

        let userId
        let role
        let ouId
        let branchId
        try {
          userId = normalizeUserIdClaim(payload[env.JWT_CLAIM_USER_ID])
          assertValidUserIdHeader(userId)
          role = normalizeRoleHeader(payload[env.JWT_CLAIM_ROLE])
          assertValidRoleHeader(role)
          ouId = normalizeTenantClaim(payload[env.JWT_CLAIM_OU])
          branchId = normalizeTenantClaim(payload[env.JWT_CLAIM_BRANCH])
        } catch {
          return fastify.gatewayProblem.send(reply, 'GATEWAY_CLAIM_REJECTED')
        }

        const incomingRid = request.headers['x-request-id']
        const requestId =
          typeof incomingRid === 'string' &&
          incomingRid.trim() !== '' &&
          incomingRid.length <= 128
            ? incomingRid.trim()
            : randomUUID()

        request.gatewayUpstreamHeaders = {
          'x-gateway-secret': env.GATEWAY_SECRET,
          'x-user-id': userId,
          'x-user-role': role,
          'x-request-id': requestId
        }
        if (ouId) request.gatewayUpstreamHeaders['x-user-ou'] = ouId
        if (branchId) request.gatewayUpstreamHeaders['x-user-branch'] = branchId
      }
    )
  },
  { name: 'gateway-inject-context' }
)
