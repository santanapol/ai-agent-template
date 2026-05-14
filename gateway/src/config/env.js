import Joi from 'joi'

const schema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3002),
  JWT_JWKS_URL: Joi.string()
    .uri()
    .pattern(/\/\.well-known\/jwks\.json$/u)
    .required(),
  JWT_ISSUER: Joi.string().allow('').optional(),
  JWT_AUDIENCE: Joi.string().allow('').optional(),
  JWT_CLAIM_USER_ID: Joi.string().default('sub'),
  JWT_CLAIM_ROLE: Joi.string().default('role'),
  JWT_CLAIM_OU: Joi.string().default('ou_id'),
  JWT_CLAIM_BRANCH: Joi.string().default('branch_id'),
  JWT_LEEWAY_SECONDS: Joi.number().integer().min(0).default(60),
  GATEWAY_SECRET: Joi.string().min(32).required(),
  UPSTREAM_TIMEOUT_MS: Joi.number().integer().positive().required(),
  ROUTES_JSON: Joi.string().allow('').optional(),
  ROUTES_FILE: Joi.string().allow('').optional(),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
  MAX_BODY_BYTES: Joi.number().integer().positive().default(1_048_576),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  SHUTDOWN_TIMEOUT_MS: Joi.number().integer().positive().default(10_000),
  PROBLEM_TYPE_BASE: Joi.string()
    .uri()
    .default('https://example.invalid/gateway/problems'),
  READY_CHECK_TIMEOUT_MS: Joi.number().integer().positive().default(2000),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  LOG_PRETTY: Joi.boolean().truthy('true').falsy('false').optional(),
  JWT_SECRET: Joi.string().allow('').optional()
}).unknown(true)

export function loadEnv (env = process.env) {
  const { value, error } = schema.validate(env, { abortEarly: false, stripUnknown: false })
  if (error) {
    const msg = error.details.map((d) => d.message).join('; ')
    throw new Error(`Invalid environment: ${msg}`)
  }

  const jwtSecret = value.JWT_SECRET
  if (jwtSecret !== undefined && jwtSecret !== null && String(jwtSecret).trim() !== '') {
    throw new Error('Invalid environment: JWT_SECRET must not be set (gateway uses JWKS only)')
  }

  const hasJson = typeof value.ROUTES_JSON === 'string' && value.ROUTES_JSON.trim() !== ''
  const hasFile = typeof value.ROUTES_FILE === 'string' && value.ROUTES_FILE.trim() !== ''
  if (hasJson === hasFile) {
    throw new Error('Invalid environment: Exactly one of ROUTES_JSON or ROUTES_FILE must be set')
  }

  return value
}
