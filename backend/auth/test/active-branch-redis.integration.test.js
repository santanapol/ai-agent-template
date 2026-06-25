/**
 * Redis publish fail-closed path for POST /auth/me/active-branch (review follow-up).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { hashRefreshToken } from '../src/lib/refresh-token.js'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const BRANCH_DB = 'branch_redis_integration_test'
const PLATFORM_USER = 'active_branch_redis_platform'
const TEST_PASS = 'Correct-Horse-Battery-Staple1!'
const TEST_OU_ID = new ObjectId()
const HOME_BRANCH_ID = new ObjectId()
const TARGET_BRANCH_ID = new ObjectId()

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_995,
    DATABASE_URI: databaseUri,
    MONGODB_URI_READ: databaseUri,
    MONGODB_DB_BRANCH: BRANCH_DB,
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
    REDIS_URL: 'redis://127.0.0.1:6379/0'
  }
}

function createMockRedis() {
  /** @type {Map<string, string>} */
  const store = new Map()
  let failSet = false
  return {
    setFailOnSet(value) {
      failSet = value
    },
    async get(key) {
      return store.has(key) ? store.get(key) : null
    },
    async set(key, value, _opts) {
      if (failSet) throw new Error('redis SET failed (test)')
      store.set(key, value)
    },
    async ping() {
      return 'PONG'
    }
  }
}

async function seedBranches(databaseUri) {
  const client = new MongoClient(databaseUri)
  await client.connect()
  const branchDb = client.db(BRANCH_DB)
  await branchDb.collection('su_branch').deleteMany({})
  await branchDb.collection('su_branch').insertMany([
    {
      _id: HOME_BRANCH_ID,
      ou_id: TEST_OU_ID,
      branch_name: 'Home Branch',
      branch_code: 'H01',
      active: true
    },
    {
      _id: TARGET_BRANCH_ID,
      ou_id: TEST_OU_ID,
      branch_name: 'Target Branch',
      branch_code: 'T01',
      active: true
    }
  ])
  await client.close()
}

async function loginNative(base, username) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: TEST_PASS,
      client_kind: 'native'
    })
  })
  assert.equal(r.status, 200)
  return r.json()
}

async function switchBranch(base, { accessToken, refreshToken, branchId }) {
  return fetch(`${base}/auth/me/active-branch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      branch_id: branchId,
      refresh_token: refreshToken
    })
  })
}

test('active-branch redis integration', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)
  await seedBranches(databaseUri)

  const mockRedis = createMockRedis()
  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()
  const hashOpts = { type: argon2.argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 4 }

  await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
    ou_id: TEST_OU_ID,
    branch_id: HOME_BRANCH_ID,
    username: PLATFORM_USER,
    password_hash: await argon2.hash(TEST_PASS, hashOpts),
    role: 'platform_admin',
    access_token_gen: 0,
    cr_by: 'test_seed',
    cr_date: now,
    cr_prog: 'test/active-branch-redis.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/active-branch-redis.integration.test.js'
  })

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), {
    logger: false,
    redisClient: mockRedis
  })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`

  t.after(async () => {
    await app.close()
    await client.close()
    await stop()
  })

  await t.test('returns 503 AUTH_NOT_READY when redis publish fails after DB commit', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    mockRedis.setFailOnSet(true)

    const r = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 503)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_NOT_READY')

    const hash = hashRefreshToken(login.refresh_token)
    const row = await db.collection(AUTH_COLLECTIONS.REFRESH_TOKENS).findOne({ token_hash: hash })
    assert.ok(row?.active_branch_id instanceof ObjectId)
    assert.ok(row.active_branch_id.equals(TARGET_BRANCH_ID))

    const successAudit = await db
      .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
      .findOne({ event_type: 'auth.active_branch_changed', outcome: 'success' })
    assert.equal(successAudit, null)
  })
})
