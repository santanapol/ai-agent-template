import { loadEnv } from './config/env.js'
import { buildApp } from './app.js'

const env = loadEnv()
const app = await buildApp(env)

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

const shutdownTimeoutMs = env.SHUTDOWN_TIMEOUT_MS
let shuttingDown = false

const signals = ['SIGINT', 'SIGTERM']
for (const signal of signals) {
  process.once(signal, () => {
    if (shuttingDown) return
    shuttingDown = true
    log.info(`Received ${signal}, shutting down gracefully...`)
    const killTimer = setTimeout(() => {
      log.error(`Shutdown exceeded ${shutdownTimeoutMs}ms`)
      process.exit(1)
    }, shutdownTimeoutMs)
    app.close((err) => {
      clearTimeout(killTimer)
      if (err) {
        log.error(err, 'Error during shutdown')
        process.exit(1)
      }
      log.info('Shutdown complete.')
      process.exit(0)
    })
  })
}

await app.listen({ port: env.PORT, host: '0.0.0.0' })
