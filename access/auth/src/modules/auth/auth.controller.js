import { loginBodySchema, refreshBodySchema, logoutBodySchema } from './auth.validator.js'
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
      const { error, value } = loginBodySchema.validate(request.body ?? {})
      if (error) {
        return sendProblem(
          reply,
          400,
          types.validation,
          'Bad Request',
          'Request body failed validation.',
          'AUTH_INVALID_REQUEST'
        )
      }
      const ip = request.ip
      const result = await service.login({
        ...value,
        ip,
        request_id: request.id
      })
      if (!result.ok) {
        const title = titleForStatus(result.status)
        const code = codeForProblemType(types, result.type)
        return sendProblem(reply, result.status, result.type, title, 'Authentication failed.', code)
      }
      applyCookie(reply, result.cookie)
      return reply.send(result.body)
    },

    async refresh(request, reply) {
      const { error, value } = refreshBodySchema.validate(request.body ?? {})
      if (error) {
        return sendProblem(
          reply,
          400,
          types.validation,
          'Bad Request',
          'Request body failed validation.',
          'AUTH_INVALID_REQUEST'
        )
      }
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
        const code = codeForProblemType(types, result.type)
        return sendProblem(
          reply,
          result.status,
          result.type,
          'Unauthorized',
          'Refresh failed.',
          code
        )
      }
      applyCookie(reply, result.cookie)
      return reply.send(result.body)
    },

    async logout(request, reply) {
      const { error, value } = logoutBodySchema.validate(request.body ?? {})
      if (error) {
        return sendProblem(
          reply,
          400,
          types.validation,
          'Bad Request',
          'Request body failed validation.',
          'AUTH_INVALID_REQUEST'
        )
      }
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
    }
  }
}
