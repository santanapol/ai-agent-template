import Joi from 'joi'

export const loginBodySchema = Joi.object({
  username: Joi.string().min(1).max(256).required(),
  password: Joi.string().min(1).max(4096).required(),
  client_kind: Joi.string().valid('browser', 'native').default('browser')
})

export const refreshBodySchema = Joi.object({
  refresh_token: Joi.string().min(10).max(512).optional()
}).unknown(true)

export const logoutBodySchema = refreshBodySchema
