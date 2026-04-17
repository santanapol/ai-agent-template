import express from 'express'
import { loadEnv } from './config/env.js'
import { gatewaySecretMiddleware } from './middlewares/gateway-secret.middleware.js'
import { createHealthRouter } from './modules/health/health.route.js'
import { createMeRouter } from './modules/me/me.route.js'
import { getRequestId, sendEnvelope } from './utils/response.util.js'

/**
 * @param {ReturnType<typeof loadEnv>} [env]
 */
export function buildApp (env = loadEnv()) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.TRUST_PROXY)
  app.use(express.json({ limit: '1mb' }))

  app.use(createHealthRouter())

  const apiV1 = express.Router()
  apiV1.use(gatewaySecretMiddleware(env.GATEWAY_SECRET))
  apiV1.use(createMeRouter())
  app.use('/api/v1', apiV1)

  app.use((req, res) => {
    sendEnvelope(res, 404, false, 'DATA_NOT_FOUND', 'Not found', null, getRequestId(req))
  })

  return app
}
