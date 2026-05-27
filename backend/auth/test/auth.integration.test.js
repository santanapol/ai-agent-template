/**
 * Integration tests against real MongoDB driver behaviour (indexes, transactions).
 * Default: `MongoMemoryReplSet` (single-node replica set) — required because auth uses `withTransaction`.
 * Optional: set `TEST_DATABASE_URI` to your own **replica set** URI (standalone will 500 on login/refresh).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { decodeJwt } from 'jose'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const TEST_USER = 'integration_user'
const TEST_PASS = 'correct-horse-battery-staple'
const TEST_OU_ID = new ObjectId()
const TEST_BRANCH_ID = new ObjectId()

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_998,
    DATABASE_URI: databaseUri,
    JWT_PRIVATE_KEY_PEM: jwtPrivateKeyPem,
    JWKS_PUBLIC_URL: 'https://auth.test.invalid/.well-known/jwks.json',
    JWT_ISSUER: 'https://auth.test.invalid',
    JWT_AUDIENCE: 'gateway',
    CORS_ORIGINS: '',
    COOKIE_SECURE: false,
    TRUST_PROXY: false,
    PROBLEM_TYPE_BASE: 'https://example.invalid/auth/problems',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_SECONDS: 86_400,
    AUTH_INTERNAL_SERVICE_SECRET: 'test-internal-service-secret-32chars',
    REDIS_URL: ''
  }
}

test('auth + Mongo integration', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()
  await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
    ou_id: TEST_OU_ID,
    branch_id: TEST_BRANCH_ID,
    username: TEST_USER,
    password_hash: await argon2.hash(TEST_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    }),
    role: 'admin',
    access_token_gen: 0,
    cr_by: 'test_seed',
    cr_date: now,
    cr_prog: 'test/auth.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/auth.integration.test.js'
  })

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), { logger: false })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`

  t.after(async () => {
    await app.close()
    await client.close()
    await stop()
  })

  await t.test('GET /healthz returns 200 with liveness fields', async () => {
    const r = await fetch(`${base}/healthz`)
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.status, 'ok')
    assert.ok(typeof body.timestamp === 'string')
    assert.ok(Number.isInteger(body.uptime))
  })

  await t.test('echoes x-request-id on response (valid inbound UUID)', async () => {
    const inbound = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const r = await fetch(`${base}/healthz`, { headers: { 'x-request-id': inbound } })
    assert.equal(r.status, 200)
    assert.equal(r.headers.get('x-request-id'), inbound)
  })

  await t.test('mints lowercase x-request-id when header absent', async () => {
    const r = await fetch(`${base}/healthz`)
    assert.equal(r.status, 200)
    const echoed = r.headers.get('x-request-id')
    assert.ok(echoed)
    assert.match(echoed, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  await t.test('GET /health is not served (use /healthz)', async () => {
    const r = await fetch(`${base}/health`)
    assert.equal(r.status, 404)
  })

  await t.test('GET /readyz returns 200 when Mongo is up', async () => {
    const r = await fetch(`${base}/readyz`)
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.status, 'ok')
    assert.ok(Array.isArray(body.dependencies))
    assert.equal(body.dependencies[0].name, 'mongodb')
    assert.equal(body.dependencies[0].status, 'ok')
  })

  await t.test('GET /.well-known/jwks.json returns keys with kid', async () => {
    const r = await fetch(`${base}/.well-known/jwks.json`)
    assert.equal(r.status, 200)
    const j = await r.json()
    assert.ok(Array.isArray(j.keys))
    assert.equal(j.keys[0].kid, 'default')
    assert.equal(j.keys[0].alg, 'RS256')
  })

  await t.test('POST /auth/login rejects wrong password with problem+json', async () => {
    const r = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: 'wrong-password',
        client_kind: 'native'
      })
    })
    assert.equal(r.status, 401)
    assert.equal(r.headers.get('content-type')?.split(';')[0], 'application/problem+json')
    const body = await r.json()
    assert.match(body.type, /invalid-credentials/u)
    assert.equal(body.status, 401)
    assert.equal(body.code, 'LOGIN_INVALID_CREDENTIALS')
  })

  await t.test('POST /auth/login (web) returns access token and cookie channel', async () => {
    const r = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'web'
      })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.access_token)
    assert.equal(body.token_type, 'Bearer')
    assert.equal(body.expires_in, 900)
    assert.equal(body.refresh_token, undefined)
    assert.match(r.headers.get('set-cookie') ?? '', /refresh_token=/u)
  })

  await t.test('POST /auth/login (native) returns tokens', async () => {
    const r = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'native'
      })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.access_token)
    assert.equal(body.token_type, 'Bearer')
    assert.equal(body.expires_in, 900)
    assert.ok(body.refresh_token)
    assert.match(body.access_token, /^[\w-]+\.[\w-]+\.[\w-]+$/u)

    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ username: TEST_USER })
    const claims = decodeJwt(body.access_token)
    assert.equal(claims.token_gen, user?.access_token_gen ?? 0)
  })

  let refresh1
  let refresh2

  await t.test('POST /auth/refresh rotates refresh token', async () => {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'native'
      })
    })
    const loginBody = await login.json()
    refresh1 = loginBody.refresh_token

    const r = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh1 })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.access_token)
    assert.ok(body.refresh_token)
    refresh2 = body.refresh_token
    assert.notEqual(refresh2, refresh1)
  })

  await t.test('POST /auth/refresh with reused token returns 401 token reuse', async () => {
    const r = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh1 })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.match(body.type, /refresh-rejected/u)
    assert.equal(body.code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('POST /auth/refresh without token returns refresh-rejected problem', async () => {
    const r = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(r.status, 401)
    assert.equal(r.headers.get('content-type')?.split(';')[0], 'application/problem+json')
    const body = await r.json()
    assert.match(body.type, /refresh-rejected/u)
    assert.equal(body.status, 401)
    assert.equal(body.code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('POST /auth/refresh with rotated token fails after family revoke', async () => {
    const r = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh2 })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.match(body.type, /refresh-rejected/u)
  })

  await t.test('POST /auth/logout revokes family (fresh login then logout)', async () => {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'native'
      })
    })
    const { refresh_token: rt } = await login.json()

    const out = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    })
    assert.equal(out.status, 204)

    const again = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    })
    assert.equal(again.status, 401)
  })

  await t.test('POST /auth/login returns 423 when account is lock-throttled', async () => {
    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ username: TEST_USER })
    assert.ok(user)
    await db.collection(AUTH_COLLECTIONS.CREDENTIAL_THROTTLE).updateOne(
      { throttle_key: `user:${user._id.toHexString()}` },
      {
        $set: {
          throttle_key: `user:${user._id.toHexString()}`,
          window_started_at: new Date(),
          fail_count: 10,
          locked_until: new Date(Date.now() + 5 * 60 * 1000)
        }
      },
      { upsert: true }
    )

    const r = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'native'
      })
    })
    assert.equal(r.status, 423)
    assert.equal(r.headers.get('content-type')?.split(';')[0], 'application/problem+json')
    const body = await r.json()
    assert.match(body.type, /account-locked/u)
    assert.equal(body.status, 423)
    assert.equal(body.code, 'LOGIN_ACCOUNT_LOCKED')
  })

  await t.test('GET /readyz returns 503 problem when Mongo is unavailable', async () => {
    await app.mongo.client.close()
    const r = await fetch(`${base}/readyz`)
    assert.equal(r.status, 503)
    assert.equal(r.headers.get('content-type')?.split(';')[0], 'application/problem+json')
    const body = await r.json()
    assert.match(body.type, /not-ready/u)
    assert.equal(body.status, 503)
    assert.equal(body.code, 'AUTH_NOT_READY')
  })
})
