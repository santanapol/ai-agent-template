import { problemPayload } from '../../lib/problem.js'
import { codeForProblemType } from '../../lib/auth-problem-codes.js'

function titleForStatus(status) {
  if (status === 423) return 'Locked'
  if (status === 429) return 'Too Many Requests'
  return 'Unauthorized'
}

export function createAuthController({ service, env, types }) {
  const sendProblem = (reply, status, type, title, detail, code) =>
    reply
      .code(status)
      .type('application/problem+json')
      .send(problemPayload({ type, title, status, detail, code }))

  const sendServiceAuthFailure = (reply, result, detail) => {
    const title = titleForStatus(result.status)
    const code = codeForProblemType(types, result.type)
    return sendProblem(reply, result.status, result.type, title, detail, code)
  }

  const sendServiceProblem = (reply, result) => {
    if (result.problem) {
      return reply.code(result.status).type('application/problem+json').send(result.problem)
    }
    return sendServiceAuthFailure(reply, result, 'Authentication failed.')
  }

  const applyCookie = (reply, cookie) => {
    if (!cookie) return
    reply.setCookie(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: env.REFRESH_TOKEN_TTL_SECONDS
    })
  }

  const clearRefreshCookie = (reply) => {
    reply.clearCookie(env.REFRESH_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax'
    })
  }

  return {
    async login(request, reply) {
      const value = request.body ?? {}
      const ip = request.ip
      const result = await service.login({
        ...value,
        ip,
        request_id: request.id
      })
      if (!result.ok) {
        return sendServiceAuthFailure(reply, result, 'Authentication failed.')
      }
      applyCookie(reply, result.cookie)
      return reply.send(result.body)
    },

    async refresh(request, reply) {
      const value = request.body ?? {}
      const { raw, channel } = service.pickRefreshToken({
        cookies: request.cookies ?? {},
        cookieName: env.REFRESH_COOKIE_NAME,
        body: value
      })
      const ip = request.ip
      const result = await service.refresh({
        rawRefresh: raw,
        refreshChannel: channel ?? 'native',
        ip,
        request_id: request.id
      })
      if (!result.ok) {
        return sendServiceAuthFailure(reply, result, 'Refresh failed.')
      }
      applyCookie(reply, result.cookie)
      return reply.send(result.body)
    },

    async logout(request, reply) {
      const value = request.body ?? {}
      const { raw } = service.pickRefreshToken({
        cookies: request.cookies ?? {},
        cookieName: env.REFRESH_COOKIE_NAME,
        body: value
      })
      const result = await service.logout({
        rawRefresh: raw,
        ip: request.ip,
        request_id: request.id
      })
      if (result.clearCookie) clearRefreshCookie(reply)
      return reply.code(result.status).send()
    },

    async getMyMenus(request, reply) {
      const result = await service.getMyMenus({
        user_id_hex: request.accessSub,
        access_token_gen_claim: request.accessTokenGen
      })

      if (!result.ok) {
        return sendServiceProblem(reply, result)
      }

      return reply.send(result.body)
    },

    async getMyBranch(request, reply) {
      const result = await service.getMyBranch({
        user_id_hex: request.accessSub,
        access_token_gen_claim: request.accessTokenGen,
        branch_id_hex: request.accessBranchId,
        ou_id_hex: request.accessOuId
      })

      if (!result.ok) {
        return sendServiceProblem(reply, result)
      }

      return reply.send(result.body)
    },

    async listMyBranches(request, reply) {
      const result = await service.listMyBranches({
        user_id_hex: request.accessSub,
        access_token_gen_claim: request.accessTokenGen,
        branch_id_hex: request.accessBranchId,
        ou_id_hex: request.accessOuId
      })

      if (!result.ok) {
        return sendServiceProblem(reply, result)
      }

      return reply.send(result.body)
    },

    async changeOwnPassword(request, reply) {
      const value = request.body ?? {}
      const result = await service.changeOwnPassword({
        user_id_hex: request.accessSub,
        access_token_gen_claim: request.accessTokenGen,
        current_password: value.current_password,
        new_password: value.new_password,
        ip: request.ip,
        request_id: request.id
      })

      if (!result.ok) {
        return sendServiceProblem(reply, result)
      }

      return reply.code(result.status).send()
    },

    async switchActiveBranch(request, reply) {
      const value = request.body ?? {}
      const { raw } = service.pickRefreshToken({
        cookies: request.cookies ?? {},
        cookieName: env.REFRESH_COOKIE_NAME,
        body: value
      })
      const result = await service.switchActiveBranch({
        user_id_hex: request.accessSub,
        access_token_gen_claim: request.accessTokenGen,
        branch_id: value.branch_id,
        rawRefresh: raw,
        ip: request.ip,
        request_id: request.id
      })

      if (!result.ok) {
        return sendServiceProblem(reply, result)
      }

      return reply.send(result.body)
    }
  }
}
