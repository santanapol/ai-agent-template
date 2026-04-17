import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

describe('GET /health', () => {
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app

  beforeAll(async () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: 3002,
      JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
      GATEWAY_SECRET: 'x'.repeat(32),
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:9","stripPrefix":true}]',
      ROUTES_FILE: ''
    })
    app = await buildApp(env, { logger: false })
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  test('does not require JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' })
  })
})
