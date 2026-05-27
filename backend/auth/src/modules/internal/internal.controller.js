import { problemPayload } from '../../lib/problem.js'

export function createInternalController({ service, types }) {
  const sendProblem = (reply, status, type, title, detail, code) =>
    reply
      .code(status)
      .type('application/problem+json')
      .send(problemPayload({ type, title, status, detail, code }))

  const sendServiceResult = (reply, result, { emptyBody = false } = {}) => {
    if (!result.ok) {
      return reply.code(result.status).type('application/problem+json').send(result.problem)
    }
    return emptyBody
      ? reply.code(result.status).send()
      : reply.code(result.status).send(result.body)
  }

  return {
    async createUser(request, reply) {
      const value = request.body ?? {}
      const result = await service.createUserByService({
        ou_id_hex: value.ou_id,
        branch_id_hex: value.branch_id,
        username: value.username,
        password: value.password,
        role: value.role,
        request_id: request.id
      })

      return sendServiceResult(reply, result)
    },

    async revokeSessions(request, reply) {
      const userIdParam = request.params.user_id
      const value = request.body ?? {}
      const result = await service.revokeSessionsByUser({
        user_id_hex: userIdParam,
        reason: value.reason,
        correlation_id: value.correlation_id,
        request_id: request.id
      })

      return sendServiceResult(reply, result)
    },

    async setPassword(request, reply) {
      const userIdParam = request.params.user_id
      const value = request.body ?? {}
      const result = await service.setPasswordByService({
        user_id_hex: userIdParam,
        password: value.password,
        revoke_sessions: value.revoke_sessions,
        reason: value.reason,
        correlation_id: value.correlation_id,
        request_id: request.id
      })

      return sendServiceResult(reply, result, { emptyBody: true })
    }
  }
}
