import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'
import { createServer } from 'node:http'
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

  beforeAll(async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256', { modulusLength: 2048 })
    const kid = 'test-kid'
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
          ifMatch,
          rid,
          rawHeaderNames
        })
      )
    })

    await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))
    await new Promise((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve))

    const jwksPort = /** @type {import('node:net').AddressInfo} */ (jwksServer.address()).port
    const upstreamPort = /** @type {import('node:net').AddressInfo} */ (upstreamServer.address()).port

    const jwksUrl = `http://127.0.0.1:${jwksPort}/.well-known/jwks.json`
    const upstreamBase = `http://127.0.0.1:${upstreamPort}`

    accessToken = await new jose.SignJWT({
      sub: 'user-1',
      role: 'admin',
      ou_id: 'ou-1',
      branch_id: 'branch-1'
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
      PORT: 3002,
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

  afterAll(async () => {
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
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('/ping')
    expect(body.hasAuthorization).toBe(false)
    expect(body.ou).toBe('ou-1')
    expect(body.branch).toBe('branch-1')
    expect(body.uid).toBe('user-1')
    expect(body.role).toBe('admin')
    expect(body.ifMatch).toBe('W/"etag-123"')
    expect(body.secret).toBe('gateway-secret-32-chars-minimum-ok!!')
    expect(typeof body.rid).toBe('string')
    expect(body.rid.length).toBeGreaterThan(0)

    const names = /** @type {string[]} */ (body.rawHeaderNames)
    const iSecret = names.indexOf('x-gateway-secret')
    const iOu = names.indexOf('x-user-ou')
    const iBranch = names.indexOf('x-user-branch')
    const iUserId = names.indexOf('x-user-id')
    const iRole = names.indexOf('x-user-role')
    const iIfMatch = names.indexOf('if-match')
    const iRequestId = names.indexOf('x-request-id')
    expect(iSecret).toBeGreaterThanOrEqual(0)
    expect(iOu).toBeGreaterThan(iSecret)
    expect(iBranch).toBeGreaterThan(iOu)
    expect(iUserId).toBeGreaterThan(iBranch)
    expect(iRole).toBeGreaterThan(iUserId)
    expect(iIfMatch).toBeGreaterThan(iRole)
    expect(iRequestId).toBeGreaterThan(iIfMatch)
  })

  test('401 without bearer token (problem+json)', async () => {
    const res = await fetch(`${gatewayBaseUrl}/api/echo/ping`)
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type')).toMatch(/application\/problem\+json/u)
    const body = await res.json()
    expect(body.code).toBe('GATEWAY_JWT_MISSING')
    expect(body.status).toBe(401)
  })

})
