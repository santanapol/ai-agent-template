import { problemPayload } from '../../lib/problem.js'
import { revokeBodySchema, validateUserIdParam } from './internal.validator.js'

export function createInternalController({ service, types }) {
  const sendValidationFailed = (reply) =>
    reply
      .code(400)
      .type('application/problem+json')
      .send(
        problemPayload({
          type: types.validation,
          title: 'Bad Request',
          status: 400,
          detail: 'Request validation failed.',
          code: 'AUTH_INVALID_REQUEST'
        })
      )

  return {
    async revokeSessions(request, reply) {
      const userIdParam = request.params.user_id
      const idCheck = validateUserIdParam(userIdParam)
      if (!idCheck.ok) {
        return sendValidationFailed(reply)
      }

      const { error, value } = revokeBodySchema.validate(request.body ?? {})
      if (error) {
        return sendValidationFailed(reply)
      }

      const result = await service.revokeSessionsByUser({
        user_id_hex: userIdParam,
        reason: value.reason,
        correlation_id: value.correlation_id,
        request_id: request.id
      })

      if (!result.ok) {
        return reply.code(result.status).type('application/problem+json').send(result.problem)
      }

      return reply.code(result.status).send(result.body)
    }
  }
}
