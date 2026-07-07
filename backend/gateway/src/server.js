import { loadEnv } from './config/env.js'
import { buildApp } from './app.js'
import { reapplyRoutesEnvFromDotenvFile } from './config/reapply-routes-env-from-dotenv.js'

const routesReapply = reapplyRoutesEnvFromDotenvFile()

const env = loadEnv()
const app = await buildApp(env)

if (routesReapply.warning) {
  app.log.warn(routesReapply.warning)
}

const prefixes = app.gatewayRoutePrefixes
if (Array.isArray(prefixes) && prefixes.length > 0) {
  app.log.info({ prefixes }, '[gateway] Effective proxy prefixes')
}

const log = app.log ?? console

function registerProcessGuards() {
  process.on('uncaughtException', (err) => {
    log.fatal(err, 'uncaughtException')
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    log.fatal({ reason }, 'unhandledRejection')
    process.exit(1)
  })
}

registerProcessGuards()

await app.listen({ port: env.PORT, host: '0.0.0.0' })

const shutdownTimeoutMs = env.SHUTDOWN_TIMEOUT_MS

/**
 * @param {NodeJS.Signals} signal
 */
async function shutdown(signal) {
  app.log.info({ signal }, 'shutdown: closing server')
  const forceTimer = setTimeout(() => {
    app.log.error({ signal }, 'shutdown: deadline exceeded, exiting')
    process.exit(1)
  }, shutdownTimeoutMs)
  forceTimer.unref?.()
  try {
    await app.close()
  } finally {
    clearTimeout(forceTimer)
  }
  process.exit(0)
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})
process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})
