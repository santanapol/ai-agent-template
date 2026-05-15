import Joi from 'joi'

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/u

/**
 * @param {string} user_id
 */
export function validateUserIdParam(user_id) {
  if (!OBJECT_ID_HEX.test(user_id)) {
    return { ok: false }
  }
  return { ok: true }
}

export const revokeBodySchema = Joi.object({
  reason: Joi.string().max(256).optional(),
  correlation_id: Joi.string().max(128).optional()
})
