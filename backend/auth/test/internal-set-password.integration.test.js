/**
 * Integration tests for internal set-password (admin reset via staff).
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

const TEST_PASS = 'correct-horse-battery-staple'
const NEW_PASS = 'new-secure-passphrase!'
const TEST_OU_ID = new ObjectId()
const TEST_BRANCH_ID = new ObjectId()
const INTERNAL_SECRET = 'test-internal-service-secret-32chars'

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_996,
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

function setPasswordUrl(base, userIdHex) {
  return `${base}/internal/users/${userIdHex}/password`
}

test('internal set password', { timeout: 180_000 }, async (t) => {
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
    username: 'set_password_user',
    password_hash: await argon2.hash(TEST_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    }),
    role: 'staff',
    access_token_gen: 0,
    cr_by: 'test_seed',
    cr_date: now,
    cr_prog: 'test/internal-set-password.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/internal-set-password.integration.test.js'
  })
  const userId = insert.insertedId
  const userHex = userId.toHexString()

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), { logger: false })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`

  t.after(async () => {
    await app.close()
    await client.close()
    await stop()
  })

  await t.test('POST without Bearer returns 401', async () => {
    const r = await fetch(setPasswordUrl(base, userHex), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: NEW_PASS })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_INTERNAL_UNAUTHORIZED')
  })

  await t.test('POST for unknown user returns 404', async () => {
    const unknownHex = new ObjectId().toHexString()
    const r = await fetch(setPasswordUrl(base, unknownHex), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ password: NEW_PASS })
    })
    assert.equal(r.status, 404)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_USER_NOT_FOUND')
  })

  await t.test('POST with short password returns 400', async () => {
    const r = await fetch(setPasswordUrl(base, userHex), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ password: 'short' })
    })
    assert.equal(r.status, 400)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_PASSWORD_POLICY_VIOLATION')
  })

  await t.test('POST success updates hash and bumps token_gen', async () => {
    const r = await fetch(setPasswordUrl(base, userHex), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({
        password: NEW_PASS,
        revoke_sessions: true,
        reason: 'staff.admin_password_reset'
      })
    })
    assert.equal(r.status, 204)

    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: userId })
    assert.equal(user.access_token_gen, 1)
    const validNew = await argon2.verify(user.password_hash, NEW_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    })
    assert.equal(validNew, true)
    const validOld = await argon2.verify(user.password_hash, TEST_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    })
    assert.equal(validOld, false)
  })
})
