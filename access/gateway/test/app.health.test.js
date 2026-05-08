import { createServer } from 'node:http'
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

describe('GET /healthz and GET /readyz', () => {
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app
  /** @type {import('node:http').Server | undefined} */
  let jwksServer

  beforeAll(async () => {
    jwksServer = createServer((req, res) => {
      if (req.url === '/.well-known/jwks.json') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ keys: [] }))
        return
      }
      res.statusCode = 404
      res.end()
    })
    await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))
    const port = /** @type {import('node:net').AddressInfo} */ (jwksServer.address()).port
    const jwksUrl = `http://127.0.0.1:${port}/.well-known/jwks.json`

    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: 3002,
      JWT_JWKS_URL: jwksUrl,
      GATEWAY_SECRET: 'x'.repeat(32),
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:9","stripPrefix":true}]',
      ROUTES_FILE: ''
    })
    app = await buildApp(env, { logger: false })
  })

  afterAll(async () => {
    if (app) await app.close()
    await new Promise((resolve) => jwksServer?.close(() => resolve(undefined)))
  })

  test('GET /healthz returns 200 without JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    expect(typeof body.timestamp).toBe('string')
    expect(typeof body.uptime).toBe('number')
  })

  test('GET /readyz returns 200 when JWKS is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    expect(Array.isArray(body.dependencies)).toBe(true)
    expect(body.dependencies.map((d) => d.name).sort()).toEqual(['jwks', 'routes'].sort())
  })

  test('GET /legacy /health is not served', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(404)
  })

  test('unknown path returns 404 (no GATEWAY_ROUTE_NOT_CONFIGURED)', async () => {
    const res = await app.inject({ method: 'GET', url: '/no-such-route' })
    expect(res.statusCode).toBe(404)
    expect(res.headers['x-gateway-hit']).toBe('true')
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/u)
    expect(JSON.parse(res.body)).toEqual({
      type: 'https://example.invalid/gateway/problems/gateway-route',
      title: 'Route not found',
      status: 404,
      detail: 'Reached gateway, no route matched',
      code: 'GATEWAY_ROUTE_NOT_FOUND'
    })
  })
})
