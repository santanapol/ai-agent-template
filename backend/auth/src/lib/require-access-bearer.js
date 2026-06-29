import { verifyAccessJwt } from './jwt-access.js'
import { extractBearerToken } from './internal-bearer.js'
import { problemPayload } from './problem.js'

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/u

export function buildRequireAccessBearer({ publicKey, env, types }) {
  return async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization)
    if (!token) {
      return reply
        .code(401)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.invalidToken,
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token is missing or invalid.',
            code: 'TOKEN_REFRESH_REJECTED'
          })
        )
    }

    try {
      const payload = await verifyAccessJwt({
        token,
        publicKey,
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
      })
      const sub = typeof payload.sub === 'string' ? payload.sub : ''
      if (!OBJECT_ID_HEX.test(sub)) {
        throw new Error('invalid sub')
      }
      request.accessSub = sub
      request.accessTokenGen = payload.token_gen
      const ouId = typeof payload.ou_id === 'string' ? payload.ou_id : ''
      const branchId = typeof payload.branch_id === 'string' ? payload.branch_id : ''
      if (OBJECT_ID_HEX.test(ouId)) request.accessOuId = ouId
      if (OBJECT_ID_HEX.test(branchId)) request.accessBranchId = branchId
    } catch {
      return reply
        .code(401)
        .type('application/problem+json')
        .send(
          problemPayload({
            type: types.invalidToken,
            title: 'Unauthorized',
            status: 401,
            detail: 'Access token is missing or invalid.',
            code: 'TOKEN_REFRESH_REJECTED'
          })
        )
    }
  }
}
