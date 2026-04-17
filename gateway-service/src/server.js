import { loadEnv } from './config/env.js'
import { buildApp } from './app.js'

const env = loadEnv()
const app = await buildApp(env)

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
