/**
 * Integration tests against real MongoDB driver behaviour (indexes, transactions).
 * Default: `MongoMemoryReplSet` (single-node replica set) — required because auth-service uses `withTransaction`.
 * Optional: set `TEST_DATABASE_URI` to your own **replica set** URI (standalone will 500 on login/refresh).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient } from 'mongodb'
import argon2 from 'argon2'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const TEST_USER = 'integration_user'
const TEST_PASS = 'correct-horse-battery-staple'

function testEnv (databaseUri, jwtPrivateKeyPem) {
  return {
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
    REFRESH_TOKEN_TTL_SECONDS: 86_400
  }
}

test('auth-service + Mongo integration', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()
  await db.collection('users').insertOne({
    username_normalized: TEST_USER,
    password_hash: await argon2.hash(TEST_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    }),
    role: 'admin',
    created_at: now,
    updated_at: now
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

  await t.test('GET /health returns 200', async () => {
    const r = await fetch(`${base}/health`)
    assert.equal(r.status, 200)
    assert.deepEqual(await r.json(), { status: 'ok' })
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
    assert.match(body.type, /token-reuse/u)
  })

  await t.test('POST /auth/refresh with rotated token fails after family revoke', async () => {
    const r = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh2 })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.match(body.type, /token-reuse|invalid-token/u)
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
})
