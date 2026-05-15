/**
 * Integration tests for O-16 internal session revoke.
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

const TEST_USER = 'revoke_internal_user'
const TEST_PASS = 'correct-horse-battery-staple'
const TEST_OU_ID = new ObjectId()
const TEST_BRANCH_ID = new ObjectId()
const INTERNAL_SECRET = 'test-internal-service-secret-32chars'

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_997,
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
    AUTH_INTERNAL_SERVICE_SECRET: INTERNAL_SECRET,
    REDIS_URL: ''
  }
}

function revokeUrl(base, userIdHex) {
  return `${base}/internal/users/${userIdHex}/sessions/revoke`
}

test('internal session revoke (O-16)', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()
  const insert = await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
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
    cr_prog: 'test/internal-revoke.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/internal-revoke.integration.test.js'
  })
  const userId = insert.insertedId

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), { logger: false })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`
  const userHex = userId.toHexString()

  t.after(async () => {
    await app.close()
    await client.close()
    await stop()
  })

  await t.test('POST internal revoke without Bearer returns 401', async () => {
    const r = await fetch(revokeUrl(base, userHex), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_INTERNAL_UNAUTHORIZED')
    assert.match(body.type, /internal-unauthorized/u)
  })

  await t.test('POST internal revoke with wrong Bearer returns 401', async () => {
    const r = await fetch(revokeUrl(base, userHex), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-secret-value-32chars!!'
      },
      body: JSON.stringify({})
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_INTERNAL_UNAUTHORIZED')
  })

  await t.test('POST internal revoke for unknown user_id returns 404', async () => {
    const unknownHex = new ObjectId().toHexString()
    const r = await fetch(revokeUrl(base, unknownHex), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({})
    })
    assert.equal(r.status, 404)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_USER_NOT_FOUND')
    assert.match(body.type, /user-not-found/u)
  })

  await t.test('POST internal revoke with invalid user_id returns 400', async () => {
    const r = await fetch(revokeUrl(base, 'not-an-object-id'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({})
    })
    assert.equal(r.status, 400)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_INVALID_REQUEST')
  })

  let refreshBeforeRevoke

  await t.test('POST internal revoke bumps gen and revokes refresh tokens', async () => {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'native'
      })
    })
    assert.equal(login.status, 200)
    const loginBody = await login.json()
    refreshBeforeRevoke = loginBody.refresh_token
    assert.equal(decodeJwt(loginBody.access_token).token_gen, 0)

    const r = await fetch(revokeUrl(base, userHex), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({
        reason: 'staff.profile_archive',
        correlation_id: 'corr-test-revoke-1'
      })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.revoked_refresh_tokens >= 1)
    assert.equal(body.access_token_gen, 1)

    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshBeforeRevoke })
    })
    assert.equal(refreshRes.status, 401)

    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: userId })
    assert.equal(user.access_token_gen, 1)
  })

  await t.test(
    'POST internal revoke idempotent second call returns 200 with zero revoked',
    async () => {
      const r = await fetch(revokeUrl(base, userHex), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${INTERNAL_SECRET}`
        },
        body: JSON.stringify({ correlation_id: 'corr-test-revoke-2' })
      })
      assert.equal(r.status, 200)
      const body = await r.json()
      assert.equal(body.revoked_refresh_tokens, 0)
      assert.equal(body.access_token_gen, 2)

      const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: userId })
      assert.equal(user.access_token_gen, 2)
    }
  )

  await t.test('login after revoke mints JWT with current token_gen', async () => {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS,
        client_kind: 'native'
      })
    })
    assert.equal(login.status, 200)
    const loginBody = await login.json()
    assert.equal(decodeJwt(loginBody.access_token).token_gen, 2)
  })
})
