import rateLimit from '@fastify/rate-limit'
import { buildRateLimitPluginOptions } from '../../lib/rate-limit.js'
import { buildRequireAccessBearer } from '../../lib/require-access-bearer.js'
import {
  loginBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  changeOwnPasswordBodySchema,
  switchActiveBranchBodySchema
} from './auth.validator.js'
/** Per-route caps (per IP) — สอดคล้อง `_coding-standards/auth/api.md` (default แนะนำ) */
const RATE_LIMIT_LOGIN = { max: 30, timeWindow: '1 minute' }
const RATE_LIMIT_REFRESH = { max: 120, timeWindow: '1 minute' }
const RATE_LIMIT_LOGOUT = { max: 60, timeWindow: '1 minute' }
const RATE_LIMIT_CHANGE_PASSWORD = { max: 10, timeWindow: '1 minute' }
const RATE_LIMIT_ME_MENUS = { max: 60, timeWindow: '1 minute' }
const RATE_LIMIT_ME_BRANCH = { max: 60, timeWindow: '1 minute' }
const RATE_LIMIT_ACTIVE_BRANCH = { max: 30, timeWindow: '1 minute' }

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{
 *   controller: ReturnType<typeof import('./auth.controller.js').createAuthController>
 *   types: Record<string, string>
 *   env: { JWT_ISSUER?: string, JWT_AUDIENCE?: string }
 *   publicKey: import('jose').KeyLike
 * }} opts
 */
export default async function authRoutePlugin(fastify, opts) {
  const { controller, types, env, publicKey } = opts

  const requireAccessBearer = buildRequireAccessBearer({ publicKey, env, types })

  await fastify.register(async (scope) => {
    await scope.register(rateLimit, buildRateLimitPluginOptions(types))

    scope.get(
      '/auth/me/menus',
      {
        config: { rateLimit: RATE_LIMIT_ME_MENUS },
        preHandler: requireAccessBearer
      },
      (request, reply) => controller.getMyMenus(request, reply)
    )

    scope.get(
      '/auth/me/branch',
      {
        config: { rateLimit: RATE_LIMIT_ME_BRANCH },
        preHandler: requireAccessBearer
      },
      (request, reply) => controller.getMyBranch(request, reply)
    )

    scope.post(
      '/auth/me/password',
      {
        schema: { body: changeOwnPasswordBodySchema },
        config: { rateLimit: RATE_LIMIT_CHANGE_PASSWORD },
        preHandler: requireAccessBearer
      },
      (request, reply) => controller.changeOwnPassword(request, reply)
    )

    scope.post(
      '/auth/me/active-branch',
      {
        schema: { body: switchActiveBranchBodySchema },
        config: { rateLimit: RATE_LIMIT_ACTIVE_BRANCH },
        preHandler: requireAccessBearer
      },
      (request, reply) => controller.switchActiveBranch(request, reply)
    )

    scope.post(
      '/auth/login',
      {
        schema: { body: loginBodySchema },
        config: { rateLimit: RATE_LIMIT_LOGIN }
      },
      (request, reply) => controller.login(request, reply)
    )
    scope.post(
      '/auth/refresh',
      {
        schema: { body: refreshBodySchema },
        config: { rateLimit: RATE_LIMIT_REFRESH }
      },
      (request, reply) => controller.refresh(request, reply)
    )
    scope.post(
      '/auth/logout',
      {
        schema: { body: logoutBodySchema },
        config: { rateLimit: RATE_LIMIT_LOGOUT }
      },
      (request, reply) => controller.logout(request, reply)
    )
  })
}
