import Joi from 'joi'

const schema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(4010),
  GATEWAY_SECRET: Joi.string().min(32).required(),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false)
}).unknown(true)

export function loadEnv (env = process.env) {
  const { value, error } = schema.validate(env, { abortEarly: false, stripUnknown: false })
  if (error) {
    const msg = error.details.map((d) => d.message).join('; ')
    throw new Error(`Invalid environment: ${msg}`)
  }
  return value
}
