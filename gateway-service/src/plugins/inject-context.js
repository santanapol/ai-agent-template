import fp from 'fastify-plugin'
import { randomUUID } from 'node:crypto'
import {
  assertValidRoleHeader,
  assertValidUserIdHeader,
  normalizeRoleHeader,
  normalizeUserIdClaim
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
          return reply.code(401).send()
        }

        let userId
        let role
        try {
          userId = normalizeUserIdClaim(payload[env.JWT_CLAIM_USER_ID])
          assertValidUserIdHeader(userId)
          role = normalizeRoleHeader(payload[env.JWT_CLAIM_ROLE])
          assertValidRoleHeader(role)
        } catch (err) {
          const code = err instanceof Error ? err.message : ''
          if (
            code === 'missing_user_id' ||
            code === 'user_id_too_long' ||
            code === 'user_id_not_ascii_printable' ||
            code === 'role_too_long'
          ) {
            return reply.code(400).send()
          }
          return reply.code(400).send()
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
      }
    )
  },
  { name: 'gateway-inject-context' }
)
