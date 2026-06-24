function resolveTz(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 'UTC'
  return String(raw).trim()
}

export function loadEnv(env = process.env) {
  const tz = resolveTz(env.TZ)
  const result = {
    NODE_ENV: env.NODE_ENV || 'development',
    TZ: 'UTC',
    PORT: env.PORT ? parseInt(env.PORT, 10) : 3001,
    DATABASE_URI: env.DATABASE_URI,
    JWT_PRIVATE_KEY_PEM: env.JWT_PRIVATE_KEY_PEM
      ? String(env.JWT_PRIVATE_KEY_PEM).replace(/\\n/g, '\n')
      : undefined,
    JWKS_PUBLIC_URL: env.JWKS_PUBLIC_URL,
    JWT_ISSUER: env.JWT_ISSUER,
    JWT_AUDIENCE: env.JWT_AUDIENCE,
    JWT_CLAIM_USER_ID: env.JWT_CLAIM_USER_ID || 'sub',
    JWT_CLAIM_ROLE: env.JWT_CLAIM_ROLE || 'role',
    JWT_KID: env.JWT_KID || 'default',
    ACCESS_TOKEN_TTL_SECONDS: env.ACCESS_TOKEN_TTL_SECONDS
      ? parseInt(env.ACCESS_TOKEN_TTL_SECONDS, 10)
      : 900,
    ACCESS_JWT_SOFT_LIMIT_BYTES: env.ACCESS_JWT_SOFT_LIMIT_BYTES
      ? parseInt(env.ACCESS_JWT_SOFT_LIMIT_BYTES, 10)
      : 4096,
    REFRESH_TOKEN_TTL_SECONDS: env.REFRESH_TOKEN_TTL_SECONDS
      ? parseInt(env.REFRESH_TOKEN_TTL_SECONDS, 10)
      : 2592000,
    ARGON2_MEMORY_KIB: env.ARGON2_MEMORY_KIB ? parseInt(env.ARGON2_MEMORY_KIB, 10) : 65536,
    ARGON2_TIME: env.ARGON2_TIME ? parseInt(env.ARGON2_TIME, 10) : 3,
    ARGON2_PARALLELISM: env.ARGON2_PARALLELISM ? parseInt(env.ARGON2_PARALLELISM, 10) : 4,
    REFRESH_COOKIE_NAME: env.REFRESH_COOKIE_NAME || 'refresh_token',
    CORS_ORIGINS: env.CORS_ORIGINS ?? '',
    PROBLEM_TYPE_BASE: env.PROBLEM_TYPE_BASE || 'https://example.invalid/auth/problems',
    TRUST_PROXY: env.TRUST_PROXY === 'true',
    COOKIE_SECURE: env.COOKIE_SECURE === 'true',
    LOG_LEVEL: env.LOG_LEVEL || 'info',
    LOG_PRETTY: env.LOG_PRETTY === 'true',
    SHUTDOWN_TIMEOUT_MS: env.SHUTDOWN_TIMEOUT_MS ? parseInt(env.SHUTDOWN_TIMEOUT_MS, 10) : 10000,
    AUTH_INTERNAL_SERVICE_SECRET: env.AUTH_INTERNAL_SERVICE_SECRET,
    REDIS_URL: env.REDIS_URL || ''
  }

  const errors = []
  if (!['production', 'development', 'test'].includes(result.NODE_ENV))
    errors.push('NODE_ENV invalid')
  if (tz !== 'UTC') errors.push('TZ must be UTC')
  if (!result.DATABASE_URI) errors.push('DATABASE_URI is required')
  if (!result.JWT_PRIVATE_KEY_PEM) errors.push('JWT_PRIVATE_KEY_PEM is required')
  if (!result.JWKS_PUBLIC_URL || !result.JWKS_PUBLIC_URL.endsWith('/.well-known/jwks.json'))
    errors.push('JWKS_PUBLIC_URL invalid')
  if (!result.AUTH_INTERNAL_SERVICE_SECRET || result.AUTH_INTERNAL_SERVICE_SECRET.length < 16)
    errors.push('AUTH_INTERNAL_SERVICE_SECRET invalid')
  if (result.NODE_ENV === 'production' && !result.REDIS_URL)
    errors.push('REDIS_URL required in production')

  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${errors.join('; ')}`)
  }

  // Windows `.env` line endings (CRLF) can leave `\r` on TZ; normalize for Node runtime.
  if (env === process.env) {
    process.env.TZ = 'UTC'
  }

  return result
}
