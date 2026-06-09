import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { createServer } from 'node:http'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

describe('GET /healthz and GET /readyz', () => {
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app
  /** @type {import('node:http').Server | undefined} */
  let jwksServer
  let redisPingFails = false

  const mockRedis = {
    async get() {
      return null
    },
    async ping() {
      if (redisPingFails) throw new Error('redis PING failed (test)')
      return 'PONG'
    },
    get isOpen() {
      return true
    },
    async quit() {}
  }

  before(async () => {
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
      PORT: 3000,
      JWT_JWKS_URL: jwksUrl,
      GATEWAY_SECRET: 'x'.repeat(32),
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:9","stripPrefix":true}]',
      ROUTES_FILE: ''
    })
    app = await buildApp(env, { logger: false, redisClient: mockRedis })
  })

  after(async () => {
    if (app) await app.close()
    await new Promise((resolve) => jwksServer?.close(() => resolve(undefined)))
  })

  test('GET /healthz returns 200 without JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    assert.strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.strictEqual(body.status, 'ok')
    assert.strictEqual(typeof body.timestamp, 'string')
    assert.strictEqual(typeof body.uptime, 'number')
  })

  test('echoes x-request-id on response (valid inbound UUID)', async () => {
    const inbound = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { 'x-request-id': inbound }
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.headers['x-request-id'], inbound)
  })

  test('mints lowercase x-request-id when header absent', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    assert.strictEqual(res.statusCode, 200)
    const echoed = res.headers['x-request-id']
    assert.notStrictEqual(echoed, undefined)
    assert.match(
      String(echoed),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  test('GET /readyz returns 200 when JWKS and Redis are reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' })
    assert.strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.strictEqual(body.status, 'ok')
    assert.strictEqual(Array.isArray(body.dependencies), true)
    assert.deepStrictEqual(
      body.dependencies.map((d) => d.name).sort(),
      ['jwks', 'redis', 'routes'].sort()
    )
  })

  test('GET /readyz returns 503 when Redis ping fails', async () => {
    redisPingFails = true
    const res = await app.inject({ method: 'GET', url: '/readyz' })
    redisPingFails = false
    assert.strictEqual(res.statusCode, 503)
    const body = JSON.parse(res.body)
    assert.strictEqual(body.code, 'GATEWAY_NOT_READY')
  })

  test('GET /legacy /health is not served', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    assert.strictEqual(res.statusCode, 404)
  })

  test('unknown path returns 404 (no GATEWAY_ROUTE_NOT_CONFIGURED)', async () => {
    const res = await app.inject({ method: 'GET', url: '/no-such-route' })
    assert.strictEqual(res.statusCode, 404)
    assert.strictEqual(res.headers['x-gateway-hit'], 'true')
    assert.match(String(res.headers['content-type']), /application\/problem\+json/u)
    assert.deepStrictEqual(JSON.parse(res.body), {
      type: 'https://example.invalid/gateway/problems/gateway-route',
      title: 'Route not found',
      status: 404,
      detail: 'Reached gateway, no route matched',
      code: 'GATEWAY_ROUTE_NOT_FOUND'
    })
  })
})
