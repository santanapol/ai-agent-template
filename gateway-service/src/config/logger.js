/**
 * Fastify / Pino logger options — dev ใช้ pino-pretty; production ใช้ JSON
 *
 * @param {{ LOG_LEVEL?: string, LOG_PRETTY?: boolean }} env
 */
export function buildFastifyLoggerOptions (env) {
  const level = env.LOG_LEVEL ?? 'info'
  const usePretty =
    env.LOG_PRETTY === true ||
    (env.LOG_PRETTY !== false && process.env.NODE_ENV !== 'production')

  if (!usePretty) {
    return { level }
  }

  return {
    level,
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
