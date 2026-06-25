/**
 * Integration tests for internal set-role.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient, ObjectId } from 'mongodb'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const TEST_OU_ID = new ObjectId()
const TEST_BRANCH_ID = new ObjectId()
const INTERNAL_SECRET = 'test-internal-service-secret-32chars'

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
    AUTH_INTERNAL_SERVICE_SECRET: INTERNAL_SECRET,
    REDIS_URL: ''
  }
}

function setRoleUrl(base, userIdHex) {
  return `${base}/internal/users/${userIdHex}/role`
}

test('internal set role', { timeout: 180_000 }, async (t) => {
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
    username: 'set_role_user',
    password_hash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
    role: 'staff',
    access_token_gen: 0,
    cr_by: 'test_seed',
    cr_date: now,
    cr_prog: 'test/internal-set-role.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/internal-set-role.integration.test.js'
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

  await t.test('PATCH without Bearer returns 401', async () => {
    const r = await fetch(setRoleUrl(base, userHex), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'support' })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_INTERNAL_UNAUTHORIZED')
  })

  await t.test('PATCH for unknown user returns 404', async () => {
    const unknownHex = new ObjectId().toHexString()
    const r = await fetch(setRoleUrl(base, unknownHex), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ role: 'support' })
    })
    assert.equal(r.status, 404)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_USER_NOT_FOUND')
  })

  await t.test('PATCH with invalid role returns 400', async () => {
    const r = await fetch(setRoleUrl(base, userHex), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ role: 'super_admin' })
    })
    assert.equal(r.status, 400)
  })

  await t.test('PATCH success updates role to support_admin and bumps token_gen', async () => {
    const supportAdminUser = await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
      ou_id: TEST_OU_ID,
      branch_id: TEST_BRANCH_ID,
      username: 'set_role_support_admin',
      password_hash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
      role: 'staff',
      access_token_gen: 0,
      cr_by: 'test_seed',
      cr_date: now,
      cr_prog: 'test/internal-set-role.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/internal-set-role.integration.test.js'
    })
    const supportAdminHex = supportAdminUser.insertedId.toHexString()

    const r = await fetch(setRoleUrl(base, supportAdminHex), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ role: 'support_admin', revoke_sessions: false })
    })
    assert.equal(r.status, 204)

    const user = await db
      .collection(AUTH_COLLECTIONS.USERS)
      .findOne({ _id: supportAdminUser.insertedId })
    assert.equal(user.role, 'support_admin')
  })

  await t.test('PATCH success updates role and bumps token_gen', async () => {
    const r = await fetch(setRoleUrl(base, userHex), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({
        role: 'support',
        revoke_sessions: true,
        correlation_id: 'corr-123'
      })
    })
    assert.equal(r.status, 204)

    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: userId })
    assert.equal(user.role, 'support')
    assert.equal(user.access_token_gen, 1)
  })
})
