import { loadEnv } from './config/env.js'
import { buildApp } from './app.js'
import { reapplyRoutesEnvFromDotenvFile } from './config/reapply-routes-env-from-dotenv.js'

reapplyRoutesEnvFromDotenvFile()

const env = loadEnv()
const app = await buildApp(env)

const prefixes = app.gatewayRoutePrefixes
if (Array.isArray(prefixes) && prefixes.length > 0) {
  console.info(
    `[gateway] Effective proxy prefixes: ${prefixes.join(' | ')}`
  )
  if (!prefixes.includes('/api/v1/reports') && prefixes.includes('/api')) {
    console.warn(
      '[gateway] /api/v1/reports is not routed to smart-report (only /api is present). If .env already includes a /api/v1/reports entry, your shell may still export ROUTES_JSON / ROUTES_FILE — Node does not override existing env vars from --env-file. Try: unset ROUTES_JSON ROUTES_FILE; npm start'
    )
  }
}

const log = app.log ?? console

function registerProcessGuards () {
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
async function shutdown (signal) {
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
