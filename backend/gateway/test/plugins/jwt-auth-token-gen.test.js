import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { createServer } from 'node:http'
import * as jose from 'jose'
import { buildApp } from '../../src/app.js'
import { loadEnv } from '../../src/config/env.js'
import { accessTokenGenRedisKey } from '../../src/lib/redis-token-gen.js'

const SUB = '507f1f77bcf86cd799439011'

describe('jwt-auth token_gen (D3)', () => {
  /** @type {import('node:http').Server | undefined} */
  let jwksServer
  /** @type {import('node:http').Server | undefined} */
  let upstreamServer
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app
  /** @type {string | undefined} */
  let gatewayBaseUrl
  /** @type {import('jose').KeyLike | undefined} */
  let privateKey
  /** @type {string | undefined} */
  let kid
  /** @type {Map<string, string>} */
  const redisStore = new Map()

  let redisGetThrows = false

  const mockRedis = {
    async get(key) {
      if (redisGetThrows) throw new Error('redis GET failed (test)')
      return redisStore.get(key) ?? null
    },
    async ping() {
      return 'PONG'
    },
    get isOpen() {
      return true
    },
    async quit() {}
  }

  before(async () => {
    const keyPair = await jose.generateKeyPair('RS256', { modulusLength: 2048 })
    privateKey = keyPair.privateKey
    const pubJwk = await jose.exportJWK(keyPair.publicKey)
    kid = 'test-kid'
    pubJwk.kid = kid
    pubJwk.use = 'sig'
    pubJwk.alg = 'RS256'

    jwksServer = createServer((req, res) => {
      if (req.url === '/.well-known/jwks.json') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ keys: [pubJwk] }))
        return
      }
      res.statusCode = 404
      res.end()
    })

    upstreamServer = createServer((req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ ok: true, uid: req.headers['x-user-id'] }))
    })

    await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))
    await new Promise((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve))

    const jwksPort = /** @type {import('node:net').AddressInfo} */ (jwksServer.address()).port
    const upstreamPort = /** @type {import('node:net').AddressInfo} */ (upstreamServer.address())
      .port
    const jwksUrl = `http://127.0.0.1:${jwksPort}/.well-known/jwks.json`
    const upstreamBase = `http://127.0.0.1:${upstreamPort}`

    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: 3000,
      JWT_JWKS_URL: jwksUrl,
      GATEWAY_SECRET: 'gateway-secret-32-chars-minimum-ok!!',
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: JSON.stringify([
        { prefix: '/api/echo', upstream: upstreamBase, stripPrefix: true }
      ]),
      ROUTES_FILE: '',
      REDIS_URL: ''
    })

    app = await buildApp(env, { logger: false, redisClient: mockRedis })
    await app.listen({ port: 0, host: '127.0.0.1' })
    const gwPort = /** @type {import('node:net').AddressInfo} */ (app.server.address()).port
    gatewayBaseUrl = `http://127.0.0.1:${gwPort}`
  })

  after(async () => {
    if (app) await app.close()
    await new Promise((resolve) => jwksServer?.close(() => resolve(undefined)))
    await new Promise((resolve) => upstreamServer?.close(() => resolve(undefined)))
  })

  async function signToken(tokenGen) {
    return new jose.SignJWT({
      sub: SUB,
      role: 'admin',
      ou_id: '507f1f77bcf86cd799439012',
      branch_id: '507f1f77bcf86cd799439013',
      token_gen: tokenGen
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(/** @type {import('jose').KeyLike} */ (privateKey))
  }

  test('rejects JWT without token_gen claim', async () => {
    const token = await new jose.SignJWT({
      sub: SUB,
      role: 'admin',
      ou_id: '507f1f77bcf86cd799439012',
      branch_id: '507f1f77bcf86cd799439013'
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(/** @type {import('jose').KeyLike} */ (privateKey))

    const res = await fetch(`${gatewayBaseUrl}/api/echo`, {
      headers: { authorization: `Bearer ${token}` }
    })
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_JWT_REJECTED')
  })

  test('rejects stale token_gen vs Redis', async () => {
    redisStore.set(accessTokenGenRedisKey(SUB), '2')
    const token = await signToken(1)
    const res = await fetch(`${gatewayBaseUrl}/api/echo`, {
      headers: { authorization: `Bearer ${token}` }
    })
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_JWT_REJECTED')
  })

  test('allows JWT when token_gen matches Redis', async () => {
    redisStore.set(accessTokenGenRedisKey(SUB), '2')
    const token = await signToken(2)
    const res = await fetch(`${gatewayBaseUrl}/api/echo`, {
      headers: { authorization: `Bearer ${token}` }
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.uid, SUB)
  })

  test('allows JWT when Redis key missing (current gen 0)', async () => {
    redisStore.delete(accessTokenGenRedisKey(SUB))
    const token = await signToken(0)
    const res = await fetch(`${gatewayBaseUrl}/api/echo`, {
      headers: { authorization: `Bearer ${token}` }
    })
    assert.strictEqual(res.status, 200)
  })

  test('rejects JWT when Redis get fails (fail-closed)', async () => {
    redisGetThrows = true
    const token = await signToken(0)
    const res = await fetch(`${gatewayBaseUrl}/api/echo`, {
      headers: { authorization: `Bearer ${token}` }
    })
    redisGetThrows = false
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_JWT_REJECTED')
  })
})
