import { problemPayload } from '../../lib/problem.js'
import { isTransactionUnsupportedOnTopology, problemTitleForStatus } from './auth.helpers.js'

export const authMixin = {
  async runUserTransaction(fn) {
    const session = this.mongoClient.startSession()
    try {
      try {
        return await session.withTransaction(async () => fn(session))
      } catch (e) {
        if (isTransactionUnsupportedOnTopology(e)) {
          return await fn(undefined)
        }
        throw e
      }
    } finally {
      await session.endSession()
    }
  },

  userNotFoundProblem() {
    return {
      ok: false,
      status: 404,
      problem: problemPayload({
        type: this.types.userNotFound,
        title: 'Not Found',
        status: 404,
        detail: 'User not found.',
        code: 'AUTH_USER_NOT_FOUND'
      })
    }
  },

  serviceProblem(status, type, detail, code) {
    return {
      ok: false,
      status,
      problem: problemPayload({
        type,
        title: problemTitleForStatus(status),
        status,
        detail,
        code
      })
    }
  }
}
