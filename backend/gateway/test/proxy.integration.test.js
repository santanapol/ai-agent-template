import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { createServer, request as httpRequest } from 'node:http'
import * as jose from 'jose'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'

describe('gateway proxy (JWKS + upstream)', () => {
  /** @type {import('node:http').Server | undefined} */
  let jwksServer
  /** @type {import('node:http').Server | undefined} */
  let upstreamServer
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app
  /** @type {string | undefined} */
  let gatewayBaseUrl
  /** @type {string | undefined} */
  let accessToken
  /** @type {import('jose').KeyLike | undefined} */
  let jwtPrivateKey
  /** @type {string | undefined} */
  let jwtKid
  /** @type {string | undefined} */
  let sharedJwksUrl

  before(async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256', { modulusLength: 2048 })
    jwtPrivateKey = privateKey
    const kid = 'test-kid'
    jwtKid = kid
    const jwk = await jose.exportJWK(publicKey)
    jwk.kid = kid
    jwk.use = 'sig'
    jwk.alg = 'RS256'

    jwksServer = createServer((req, res) => {
      if (req.url === '/.well-known/jwks.json') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ keys: [jwk] }))
        return
      }
      res.statusCode = 404
      res.end()
    })

    upstreamServer = createServer((req, res) => {
      res.setHeader('content-type', 'application/json')
      const secret = req.headers['x-gateway-secret']
      const ou = req.headers['x-user-ou']
      const branch = req.headers['x-user-branch']
      const uid = req.headers['x-user-id']
      const role = req.headers['x-user-role']
      const permissions = req.headers['x-user-permissions']
      const ifMatch = req.headers['if-match']
      const rid = req.headers['x-request-id']
      const auth = req.headers.authorization
      const rawHeaderNames = req.rawHeaders
        .filter((_v, idx) => idx % 2 === 0)
        .map((name) => String(name).toLowerCase())
      res.end(
        JSON.stringify({
          url: req.url,
          hasAuthorization: Boolean(auth),
          secret,
          ou,
          branch,
          uid,
          role,
          permissions,
          ifMatch,
          rid,
          rawHeaderNames
        })
      )
    })

    await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))
    await new Promise((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve))

    const jwksPort = /** @type {import('node:net').AddressInfo} */ (jwksServer.address()).port
    const upstreamPort = /** @type {import('node:net').AddressInfo} */ (upstreamServer.address())
      .port

    const jwksUrl = `http://127.0.0.1:${jwksPort}/.well-known/jwks.json`
    sharedJwksUrl = jwksUrl
    const upstreamBase = `http://127.0.0.1:${upstreamPort}`

    accessToken = await new jose.SignJWT({
      sub: '507f1f77bcf86cd799439011',
      role: 'admin',
      ou_id: 'ou-1',
      branch_id: 'branch-1',
      token_gen: 0
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(privateKey)

    const routesJson = JSON.stringify([
      { prefix: '/api/echo', upstream: upstreamBase, stripPrefix: true }
    ])

    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: 3000,
      JWT_JWKS_URL: jwksUrl,
      JWT_ISSUER: '',
      JWT_AUDIENCE: '',
      JWT_CLAIM_USER_ID: 'sub',
      JWT_CLAIM_ROLE: 'role',
      GATEWAY_SECRET: 'gateway-secret-32-chars-minimum-ok!!',
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: routesJson,
      ROUTES_FILE: ''
    })

    app = await buildApp(env, { logger: false })
    await app.listen({ port: 0, host: '127.0.0.1' })
    const gwPort = /** @type {import('node:net').AddressInfo} */ (app.server.address()).port
    gatewayBaseUrl = `http://127.0.0.1:${gwPort}`
  })

  after(async () => {
    if (app) await app.close()
    await new Promise((resolve) => upstreamServer?.close(() => resolve(undefined)))
    await new Promise((resolve) => jwksServer?.close(() => resolve(undefined)))
  })

  test('proxies with injected trusted headers and strips Authorization', async () => {
    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'If-Match': 'W/"etag-123"'
      }
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.url, '/ping')
    assert.strictEqual(body.hasAuthorization, false)
    assert.strictEqual(body.ou, 'ou-1')
    assert.strictEqual(body.branch, 'branch-1')
    assert.strictEqual(body.uid, '507f1f77bcf86cd799439011')
    assert.strictEqual(body.role, 'admin')
    assert.strictEqual(body.permissions, '')
    assert.strictEqual(body.ifMatch, 'W/"etag-123"')
    assert.strictEqual(body.secret, 'gateway-secret-32-chars-minimum-ok!!')
    assert.strictEqual(typeof body.rid, 'string')
    assert.ok(body.rid.length > 0)

    const names = /** @type {string[]} */ (body.rawHeaderNames)
    const iSecret = names.indexOf('x-gateway-secret')
    const iOu = names.indexOf('x-user-ou')
    const iBranch = names.indexOf('x-user-branch')
    const iUserId = names.indexOf('x-user-id')
    const iRole = names.indexOf('x-user-role')
    const iPermissions = names.indexOf('x-user-permissions')
    const iIfMatch = names.indexOf('if-match')
    const iRequestId = names.indexOf('x-request-id')
    assert.ok(iSecret >= 0)
    assert.ok(iOu > iSecret)
    assert.ok(iBranch > iOu)
    assert.ok(iUserId > iBranch)
    assert.ok(iRole > iUserId)
    assert.ok(iPermissions > iRole)
    assert.ok(iIfMatch > iPermissions)
    assert.ok(iRequestId > iIfMatch)
  })

  test('401 without bearer token (problem+json)', async () => {
    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`)
    assert.strictEqual(res.status, 401)
    assert.match(String(res.headers.get('content-type')), /application\/problem\+json/u)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_JWT_MISSING')
    assert.strictEqual(body.status, 401)
  })

  test('401 GATEWAY_CLAIM_REJECTED when JWT omits ou_id (tenant claim)', async () => {
    const token = await new jose.SignJWT({
      sub: '507f1f77bcf86cd799439011',
      role: 'admin',
      branch_id: 'branch-1',
      token_gen: 0
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwtKid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(/** @type {import('jose').KeyLike} */ (jwtPrivateKey))

    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_CLAIM_REJECTED')
    assert.match(String(String(body.detail ?? '')), /tenant claims/u)
  })

  test('401 GATEWAY_CLAIM_REJECTED when JWT omits branch_id (tenant claim)', async () => {
    const token = await new jose.SignJWT({
      sub: '507f1f77bcf86cd799439011',
      role: 'admin',
      ou_id: 'ou-1',
      token_gen: 0
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwtKid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(/** @type {import('jose').KeyLike} */ (jwtPrivateKey))

    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_CLAIM_REJECTED')
  })

  test('502 GATEWAY_UPSTREAM_UNAVAILABLE detail does not leak workspace paths', async () => {
    const hole = createServer()
    await new Promise((resolve) => hole.listen(0, '127.0.0.1', resolve))
    const deadPort = /** @type {import('node:net').AddressInfo} */ (hole.address()).port
    await new Promise((resolve) => hole.close(() => resolve(undefined)))

    const routesJson = JSON.stringify([
      { prefix: '/api/dead', upstream: `http://127.0.0.1:${deadPort}`, stripPrefix: true }
    ])

    const envDead = loadEnv({
      NODE_ENV: 'test',
      PORT: 3002,
      JWT_JWKS_URL: /** @type {string} */ (sharedJwksUrl),
      JWT_ISSUER: '',
      JWT_AUDIENCE: '',
      JWT_CLAIM_USER_ID: 'sub',
      JWT_CLAIM_ROLE: 'role',
      GATEWAY_SECRET: 'gateway-secret-32-chars-minimum-ok!!',
      UPSTREAM_TIMEOUT_MS: 2000,
      ROUTES_JSON: routesJson,
      ROUTES_FILE: ''
    })

    const deadApp = await buildApp(envDead, { logger: false })
    await deadApp.listen({ port: 0, host: '127.0.0.1' })
    const deadGwPort = /** @type {import('node:net').AddressInfo} */ (deadApp.server.address()).port
    const deadBase = `http://127.0.0.1:${deadGwPort}`

    try {
      const res = await fetch(`${deadBase}/api/dead/ping`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      assert.strictEqual(res.status, 502)
      const body = await res.json()
      assert.strictEqual(body.code, 'GATEWAY_UPSTREAM_UNAVAILABLE')
      const d = String(body.detail ?? '')
      assert.doesNotMatch(String(d), /\.demo/u)
      assert.doesNotMatch(String(d), /demo-service/u)
      assert.doesNotMatch(String(d), /ROUTES_JSON/u)
    } finally {
      await deadApp.close()
    }
  })

  test('proxies with permissions claim formatted to comma-separated x-user-permissions', async () => {
    const permissionsToken = await new jose.SignJWT({
      sub: '507f1f77bcf86cd799439011',
      role: 'admin',
      ou_id: 'ou-1',
      branch_id: 'branch-1',
      permissions: ['profiles:*', 'invoice:read'],
      token_gen: 0
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwtKid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(jwtPrivateKey)

    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: {
        Authorization: `Bearer ${permissionsToken}`
      }
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.permissions, 'profiles:*,invoice:read')
  })

  test('strips client-supplied x-user-permissions header', async () => {
    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-user-permissions': 'malicious:all'
      }
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.permissions, '')
  })

  test('401 GATEWAY_CLAIM_REJECTED on duplicate x-user-permissions', async () => {
    const res = await new Promise((resolve, reject) => {
      const parsedUrl = new URL(`${gatewayBaseUrl}/api/echo/ping`)
      const req = httpRequest(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-user-permissions': ['a', 'b']
          }
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              body: data
            })
          })
        }
      )
      req.on('error', reject)
      req.end()
    })

    assert.strictEqual(res.status, 401)
    const body = JSON.parse(res.body)
    assert.strictEqual(body.code, 'GATEWAY_CLAIM_REJECTED')
    assert.match(body.detail, /Duplicate header not allowed/u)
  })

  test('401 GATEWAY_CLAIM_REJECTED on invalid permissions claim format (not array)', async () => {
    const badToken = await new jose.SignJWT({
      sub: '507f1f77bcf86cd799439011',
      role: 'admin',
      ou_id: 'ou-1',
      branch_id: 'branch-1',
      permissions: 'profiles:*',
      token_gen: 0
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwtKid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(jwtPrivateKey)

    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: { Authorization: `Bearer ${badToken}` }
    })
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_CLAIM_REJECTED')
  })

  test('401 GATEWAY_CLAIM_REJECTED on invalid permissions claim format (contains comma)', async () => {
    const badToken = await new jose.SignJWT({
      sub: '507f1f77bcf86cd799439011',
      role: 'admin',
      ou_id: 'ou-1',
      branch_id: 'branch-1',
      permissions: ['profiles:*,invoice:read'],
      token_gen: 0
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwtKid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(jwtPrivateKey)

    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`, {
      headers: { Authorization: `Bearer ${badToken}` }
    })
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'GATEWAY_CLAIM_REJECTED')
  })
})

describe('gateway public /auth proxy', () => {
  /** @type {import('node:http').Server | undefined} */
  let upstreamServer
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app
  /** @type {string | undefined} */
  let gatewayBaseUrl

  before(async () => {
    upstreamServer = createServer((req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          url: req.url,
          hasAuthorization: Boolean(req.headers.authorization),
          uid: req.headers['x-user-id'],
          secret: req.headers['x-gateway-secret']
        })
      )
    })

    await new Promise((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve))
    const upstreamPort = /** @type {import('node:net').AddressInfo} */ (upstreamServer.address())
      .port
    const upstreamBase = `http://127.0.0.1:${upstreamPort}`

    const routesJson = JSON.stringify([
      {
        prefix: '/auth',
        upstream: upstreamBase,
        stripPrefix: false,
        isPublic: true
      }
    ])

    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: 3001,
      JWT_JWKS_URL: 'http://127.0.0.1:9/.well-known/jwks.json',
      JWT_ISSUER: '',
      JWT_AUDIENCE: '',
      JWT_CLAIM_USER_ID: 'sub',
      JWT_CLAIM_ROLE: 'role',
      GATEWAY_SECRET: 'gateway-secret-32-chars-minimum-ok!!',
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: routesJson,
      ROUTES_FILE: ''
    })

    app = await buildApp(env, { logger: false, redisClient: null })
    await app.listen({ port: 0, host: '127.0.0.1' })
    const gwPort = /** @type {import('node:net').AddressInfo} */ (app.server.address()).port
    gatewayBaseUrl = `http://127.0.0.1:${gwPort}`
  })

  after(async () => {
    if (app) await app.close()
    await new Promise((resolve) => upstreamServer?.close(() => resolve(undefined)))
  })

  test('forwards Authorization on isPublic /auth and strips spoofed mesh headers', async () => {
    const res = await fetch(`${gatewayBaseUrl}/auth/me/menus`, {
      headers: {
        Authorization: 'Bearer upstream-test-token',
        'x-user-id': 'spoofed-user',
        'x-gateway-secret': 'evil-secret'
      }
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.url, '/auth/me/menus')
    assert.strictEqual(body.hasAuthorization, true)
    assert.strictEqual(body.uid, undefined)
    assert.strictEqual(body.secret, undefined)
  })
})
