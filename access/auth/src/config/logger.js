/**
 * Fastify / Pino logger options — dev ใช้ pino-pretty อ่านง่าย; production ใช้ JSON (เก็บ log ได้)
 *
 * `redact` สอดคล้อง `_coding-standards/backend/observability.md` §2.2 (อ้างผ่าน `_coding-standards/auth/README.md`)
 *
 * @param {{ LOG_LEVEL?: string, LOG_PRETTY?: boolean }} env
 */

const PINO_REDACT = {
  paths: [
    'req.headers["x-gateway-secret"]',
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.password',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.apiKey',
    '*.secret',
    'req.body.password',
    'req.body.refreshToken',
    'req.body.refresh_token',
    'process.env.DATABASE_URI',
    'process.env.JWT_PRIVATE_KEY_PEM'
  ],
  censor: '[REDACTED]',
  remove: false
}

export function buildFastifyLoggerOptions (env) {
  const level = env.LOG_LEVEL ?? 'info'
  const usePretty =
    env.LOG_PRETTY === true || (env.LOG_PRETTY !== false && process.env.NODE_ENV !== 'production')

  const base = { level, redact: PINO_REDACT }

  if (!usePretty) {
    return base
  }

  return {
    ...base,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
        errorLikeObjectKeys: ['err', 'error']
      }
    }
  }
}
