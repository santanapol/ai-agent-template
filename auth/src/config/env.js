import Joi from 'joi'

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
  TZ: Joi.string().valid('UTC').default('UTC'),
  PORT: Joi.number().integer().min(1).max(65535).default(3001),
  DATABASE_URI: Joi.string().required(),
  JWT_PRIVATE_KEY_PEM: Joi.string()
    .required()
    .custom((v) => String(v).replace(/\\n/g, '\n')),
  JWKS_PUBLIC_URL: Joi.string()
    .uri()
    .pattern(/\/\.well-known\/jwks\.json$/u)
    .required(),
  JWT_ISSUER: Joi.string().optional(),
  JWT_AUDIENCE: Joi.string().optional(),
  JWT_CLAIM_USER_ID: Joi.string().default('sub'),
  JWT_CLAIM_ROLE: Joi.string().default('role'),
  JWT_KID: Joi.string().default('default'),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(2_592_000),
  ARGON2_MEMORY_KIB: Joi.number().integer().positive().default(65_536),
  ARGON2_TIME: Joi.number().integer().positive().max(10).default(3),
  ARGON2_PARALLELISM: Joi.number().integer().positive().max(8).default(4),
  REFRESH_COOKIE_NAME: Joi.string().default('refresh_token'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  PROBLEM_TYPE_BASE: Joi.string().uri().default('https://example.invalid/auth/problems'),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  LOG_LEVEL: Joi.string().valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_PRETTY: Joi.boolean().truthy('true').falsy('false').optional(),
  SHUTDOWN_TIMEOUT_MS: Joi.number().integer().positive().max(120_000).default(10_000),
  AUTH_INTERNAL_SERVICE_SECRET: Joi.string().min(16).required(),
  /**
   * When set, auth publishes `user:{sub}:token_gen` after internal revoke (D1).
   * Required in production (org gateway `token_gen` gate).
   */
  REDIS_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default('')
  })
}).unknown(true)

export function loadEnv(env = process.env) {
  const { value, error } = schema.validate(env, { abortEarly: false, stripUnknown: false })
  if (error) {
    const msg = error.details.map((d) => d.message).join('; ')
    throw new Error(`Invalid environment: ${msg}`)
  }
  return value
}
