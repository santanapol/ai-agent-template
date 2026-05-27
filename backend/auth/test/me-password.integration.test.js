/**
 * Integration tests for POST /auth/me/password (self-service).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const TEST_USER = 'me_password_user'
const TEST_PASS = 'correct-horse-battery-staple'
const NEW_PASS = 'brand-new-secure-pass!'
const TEST_OU_ID = new ObjectId()
const TEST_BRANCH_ID = new ObjectId()

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_995,
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

test('POST /auth/me/password', { timeout: 180_000 }, async (t) => {
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
    cr_prog: 'test/me-password.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/me-password.integration.test.js'
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

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USER,
      password: TEST_PASS,
      client_kind: 'native'
    })
  })
  assert.equal(loginRes.status, 200)
  const loginBody = await loginRes.json()
  const accessToken = loginBody.access_token

  await t.test('without Bearer returns 401', async () => {
    const r = await fetch(`${base}/auth/me/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: TEST_PASS,
        new_password: NEW_PASS
      })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('wrong current password returns 401 LOGIN_INVALID_CREDENTIALS', async () => {
    const r = await fetch(`${base}/auth/me/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        current_password: 'wrong-password-value!!',
        new_password: NEW_PASS
      })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'LOGIN_INVALID_CREDENTIALS')
  })

  await t.test('unchanged new password returns 400 AUTH_PASSWORD_UNCHANGED', async () => {
    const r = await fetch(`${base}/auth/me/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        current_password: TEST_PASS,
        new_password: TEST_PASS
      })
    })
    assert.equal(r.status, 400)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_PASSWORD_UNCHANGED')
  })

  await t.test('success returns 204 and updates password', async () => {
    const r = await fetch(`${base}/auth/me/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        current_password: TEST_PASS,
        new_password: NEW_PASS
      })
    })
    assert.equal(r.status, 204)

    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ username: TEST_USER })
    assert.equal(user.access_token_gen, 1)
    const ok = await argon2.verify(user.password_hash, NEW_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    })
    assert.equal(ok, true)

    const loginNew = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: NEW_PASS,
        client_kind: 'native'
      })
    })
    assert.equal(loginNew.status, 200)
  })

  await t.test('stale access token after token_gen bump returns 401', async () => {
    const r = await fetch(`${base}/auth/me/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        current_password: NEW_PASS,
        new_password: 'another-new-secure-pass!'
      })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'TOKEN_REFRESH_REJECTED')
  })
})
