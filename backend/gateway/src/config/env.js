function resolveTz(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 'UTC'
  return String(raw).trim()
}

export function loadEnv(env = process.env) {
  const tz = resolveTz(env.TZ)
  const result = {
    NODE_ENV: env.NODE_ENV || 'development',
    TZ: 'UTC',
    PORT: env.PORT ? parseInt(env.PORT, 10) : 3000,
    JWT_JWKS_URL: env.JWT_JWKS_URL,
    JWT_ISSUER: env.JWT_ISSUER ?? '',
    JWT_AUDIENCE: env.JWT_AUDIENCE ?? '',
    JWT_CLAIM_USER_ID: env.JWT_CLAIM_USER_ID || 'sub',
    JWT_CLAIM_ROLE: env.JWT_CLAIM_ROLE || 'role',
    JWT_CLAIM_OU: env.JWT_CLAIM_OU || 'ou_id',
    JWT_CLAIM_BRANCH: env.JWT_CLAIM_BRANCH || 'branch_id',
    JWT_CLAIM_HOME_BRANCH: env.JWT_CLAIM_HOME_BRANCH || 'home_branch_id',
    JWT_LEEWAY_SECONDS: env.JWT_LEEWAY_SECONDS ? parseInt(env.JWT_LEEWAY_SECONDS, 10) : 60,
    GATEWAY_SECRET: env.GATEWAY_SECRET,
    UPSTREAM_TIMEOUT_MS: env.UPSTREAM_TIMEOUT_MS
      ? parseInt(env.UPSTREAM_TIMEOUT_MS, 10)
      : undefined,
    ROUTES_JSON: env.ROUTES_JSON ?? '',
    ROUTES_FILE: env.ROUTES_FILE ?? '',
    TRUST_PROXY: env.TRUST_PROXY === 'true',
    MAX_BODY_BYTES: env.MAX_BODY_BYTES ? parseInt(env.MAX_BODY_BYTES, 10) : 1048576,
    CORS_ORIGINS: env.CORS_ORIGINS ?? '',
    SHUTDOWN_TIMEOUT_MS: env.SHUTDOWN_TIMEOUT_MS ? parseInt(env.SHUTDOWN_TIMEOUT_MS, 10) : 10000,
    PROBLEM_TYPE_BASE: env.PROBLEM_TYPE_BASE || 'https://example.invalid/gateway/problems',
    READY_CHECK_TIMEOUT_MS: env.READY_CHECK_TIMEOUT_MS
      ? parseInt(env.READY_CHECK_TIMEOUT_MS, 10)
      : 2000,
    LOG_LEVEL: env.LOG_LEVEL || 'info',
    LOG_PRETTY: env.LOG_PRETTY === 'true',
    JWT_SECRET: env.JWT_SECRET ?? '',
    REDIS_URL: env.REDIS_URL || ''
  }

  const errors = []
  if (!['production', 'development', 'test'].includes(result.NODE_ENV))
    errors.push('NODE_ENV invalid')
  if (tz !== 'UTC') errors.push('TZ must be UTC')
  if (!result.JWT_JWKS_URL || !result.JWT_JWKS_URL.endsWith('/.well-known/jwks.json'))
    errors.push('JWT_JWKS_URL invalid')
  if (!result.GATEWAY_SECRET || result.GATEWAY_SECRET.length < 32)
    errors.push('GATEWAY_SECRET invalid')
  if (!result.UPSTREAM_TIMEOUT_MS || result.UPSTREAM_TIMEOUT_MS <= 0)
    errors.push('UPSTREAM_TIMEOUT_MS invalid')
  if (result.NODE_ENV === 'production' && !result.REDIS_URL)
    errors.push('REDIS_URL required in production')

  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${errors.join('; ')}`)
  }

  if (env === process.env) {
    process.env.TZ = 'UTC'
  }

  const jwtSecret = result.JWT_SECRET
  if (jwtSecret !== undefined && jwtSecret !== null && String(jwtSecret).trim() !== '') {
    throw new Error('Invalid environment: JWT_SECRET must not be set (gateway uses JWKS only)')
  }

  const hasJson = typeof result.ROUTES_JSON === 'string' && result.ROUTES_JSON.trim() !== ''
  const hasFile = typeof result.ROUTES_FILE === 'string' && result.ROUTES_FILE.trim() !== ''
  if (hasJson === hasFile) {
    throw new Error('Invalid environment: Exactly one of ROUTES_JSON or ROUTES_FILE must be set')
  }

  return result
}
