import fp from 'fastify-plugin'
import * as jose from 'jose'
import { getCurrentTokenGenFromRedis, parseTokenGenFromPayload } from '../lib/redis-token-gen.js'

/**
 * @typedef {{
 *   env: ReturnType<import('../config/env.js').loadEnv>
 *   redisClient?: { get: (key: string) => Promise<string | null> } | null
 * }} JwtAuthOptions
 */

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {JwtAuthOptions} opts
   */
  async function jwtAuthPlugin(fastify, opts) {
    const { env, redisClient = null } = opts
    const JWKS = jose.createRemoteJWKSet(new URL(env.JWT_JWKS_URL))

    fastify.decorate('verifyJwt', async function verifyJwt(request, reply) {
      const auth = request.headers.authorization
      if (!auth || !String(auth).startsWith('Bearer ')) {
        return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_MISSING')
      }
      const token = String(auth).slice('Bearer '.length).trim()
      if (!token) {
        return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_MISSING')
      }
      try {
        /** @type {import('jose').JWTVerifyOptions} */
        const verifyOpts = { clockTolerance: env.JWT_LEEWAY_SECONDS }
        const iss =
          env.JWT_ISSUER !== undefined && env.JWT_ISSUER !== null
            ? String(env.JWT_ISSUER).trim()
            : ''
        const aud =
          env.JWT_AUDIENCE !== undefined && env.JWT_AUDIENCE !== null
            ? String(env.JWT_AUDIENCE).trim()
            : ''
        if (iss !== '') verifyOpts.issuer = iss
        if (aud !== '') verifyOpts.audience = aud
        const { payload } = await jose.jwtVerify(token, JWKS, verifyOpts)

        const jwtGen = parseTokenGenFromPayload(payload)
        if (jwtGen === null) {
          return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED', {
            detail: 'Access token is missing a valid token_gen claim.'
          })
        }

        if (redisClient) {
          const sub =
            payload.sub !== undefined && payload.sub !== null ? String(payload.sub).trim() : ''
          if (sub === '') {
            return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED')
          }
          try {
            const currentGen = await getCurrentTokenGenFromRedis(redisClient, sub)
            if (jwtGen < currentGen) {
              return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED', {
                detail: 'Access token generation is stale.'
              })
            }
          } catch (err) {
            request.log.warn({ err, sub }, 'redis token_gen read failed')
            return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED', {
              detail: 'Unable to validate access token generation.'
            })
          }
        }

        request.jwtPayload = payload
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String(/** @type {{ code?: unknown }} */ (err).code)
            : 'unknown'
        request.log.debug({ jwtVerifyFailedCode: code }, 'jwt verify failed')
        return fastify.gatewayProblem.send(reply, 'GATEWAY_JWT_REJECTED')
      }
    })
  },
  { name: 'gateway-jwt-auth' }
)
