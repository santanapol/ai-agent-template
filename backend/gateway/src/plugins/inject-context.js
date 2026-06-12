import fp from 'fastify-plugin'
import {
  assertValidRoleHeader,
  assertValidUserIdHeader,
  normalizeRoleHeader,
  normalizeUserIdClaim,
  normalizeTenantClaim,
  normalizePermissionsClaim
} from '../lib/claims.js'

/**
 * @typedef {{ env: ReturnType<import('../config/env.js').loadEnv> }} InjectContextOptions
 */

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {InjectContextOptions} opts
   */
  async function injectContextPlugin(fastify, opts) {
    const { env } = opts

    fastify.decorate('injectContext', async function injectContext(request, reply) {
      const payload = request.jwtPayload
      if (!payload || typeof payload !== 'object') {
        return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED')
      }

      let userId
      let role
      let ouId
      let branchId
      let permissions
      try {
        userId = normalizeUserIdClaim(payload[env.JWT_CLAIM_USER_ID])
        assertValidUserIdHeader(userId)
        role = normalizeRoleHeader(payload[env.JWT_CLAIM_ROLE])
        assertValidRoleHeader(role)
        ouId = normalizeTenantClaim(payload[env.JWT_CLAIM_OU])
        branchId = normalizeTenantClaim(payload[env.JWT_CLAIM_BRANCH])
        permissions = normalizePermissionsClaim(payload.permissions)
      } catch (err) {
        request.log.debug({ err }, 'claim normalization or validation failed')
        return fastify.gatewayProblem.send(reply, 'GATEWAY_CLAIM_REJECTED')
      }

      if (ouId === '' || branchId === '') {
        return fastify.gatewayProblem.send(reply, 'GATEWAY_CLAIM_REJECTED', {
          detail:
            'JWT is missing required tenant claims for this gateway (expected non-empty values for claims mapped to x-user-ou and x-user-branch).'
        })
      }

      const requestId = String(request.id)
      const incomingIfMatch = request.headers['if-match']
      const ifMatch =
        typeof incomingIfMatch === 'string' && incomingIfMatch.trim() !== ''
          ? incomingIfMatch.trim()
          : ''

      request.gatewayUpstreamHeaders = {
        'x-gateway-secret': env.GATEWAY_SECRET,
        'x-user-ou': ouId,
        'x-user-branch': branchId,
        'x-user-id': userId,
        'x-user-role': role,
        'x-user-permissions': permissions,
        'x-request-id': requestId
      }
      if (ifMatch) request.gatewayUpstreamHeaders['if-match'] = ifMatch
    })
  },
  { name: 'gateway-inject-context' }
)
