import fp from 'fastify-plugin'
import * as jose from 'jose'

/**
 * @typedef {{ env: ReturnType<import('../config/env.js').loadEnv> }} JwtAuthOptions
 */

export default fp(
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {JwtAuthOptions} opts
   */
  async function jwtAuthPlugin (fastify, opts) {
    const { env } = opts
    const JWKS = jose.createRemoteJWKSet(new URL(env.JWT_JWKS_URL))

    fastify.decorate(
      'verifyJwt',
      async function verifyJwt (request, reply) {
        const auth = request.headers.authorization
        if (!auth || !String(auth).startsWith('Bearer ')) {
          return reply.code(401).send()
        }
        const token = String(auth).slice('Bearer '.length).trim()
        if (!token) {
          return reply.code(401).send()
        }
        try {
          /** @type {import('jose').JWTVerifyOptions} */
          const verifyOpts = { clockTolerance: env.JWT_LEEWAY_SECONDS }
          const iss = env.JWT_ISSUER !== undefined && env.JWT_ISSUER !== null ? String(env.JWT_ISSUER).trim() : ''
          const aud = env.JWT_AUDIENCE !== undefined && env.JWT_AUDIENCE !== null ? String(env.JWT_AUDIENCE).trim() : ''
          if (iss !== '') verifyOpts.issuer = iss
          if (aud !== '') verifyOpts.audience = aud
          const { payload } = await jose.jwtVerify(token, JWKS, verifyOpts)
          request.jwtPayload = payload
        } catch (err) {
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String(/** @type {{ code?: unknown }} */ (err).code)
              : 'unknown'
          request.log.debug({ jwtVerifyFailedCode: code }, 'jwt verify failed')
          return reply.code(401).send()
        }
      }
    )
  },
  { name: 'gateway-jwt-auth' }
)
