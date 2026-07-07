/**
 * Integration tests for GET /auth/me/branches
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
import { ensureZeroHqBranch } from '../scripts/seed-data/ensure-zero-hq.mjs'
import { ZERO_HQ_BRANCH_ID } from '../scripts/seed-data/zero-hq.js'

const BRANCH_DB = 'branch_list_integration_test'
const PLATFORM_USER = 'branch_list_platform'
const SUPPORT_USER = 'branch_list_support'
const STAFF_USER = 'branch_list_staff'
const BRANCH_ADMIN_USER = 'branch_list_branch_admin'
const TEST_PASS = 'Correct-Horse-Battery-Staple1!'
const TEST_OU_ID = new ObjectId()
const OTHER_OU_ID = new ObjectId()
const HOME_BRANCH_ID = new ObjectId()
const TARGET_BRANCH_ID = new ObjectId()
const INACTIVE_BRANCH_ID = new ObjectId()
const FOREIGN_BRANCH_ID = new ObjectId()
const ZERO_HQ_ID = new ObjectId(ZERO_HQ_BRANCH_ID)

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
    REDIS_URL: ''
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
    },
    {
      _id: INACTIVE_BRANCH_ID,
      ou_id: TEST_OU_ID,
      branch_name: 'Inactive Branch',
      branch_code: 'I01',
      active: false
    },
    {
      _id: FOREIGN_BRANCH_ID,
      ou_id: OTHER_OU_ID,
      branch_name: 'Foreign Branch',
      branch_code: 'F01',
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

async function listBranches(base, accessToken) {
  return fetch(`${base}/auth/me/branches`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

function branchIds(body) {
  return (body.branches ?? []).map((b) => b.branch_id).sort()
}

test('GET /auth/me/branches', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)
  await seedBranches(databaseUri)

  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  await ensureZeroHqBranch(db, { ouId: TEST_OU_ID, branchId: ZERO_HQ_ID })

  const now = new Date()
  const hashOpts = { type: argon2.argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 4 }

  await db.collection(AUTH_COLLECTIONS.USERS).insertMany([
    {
      ou_id: TEST_OU_ID,
      branch_id: HOME_BRANCH_ID,
      username: PLATFORM_USER,
      password_hash: await argon2.hash(TEST_PASS, hashOpts),
      role: 'platform_admin',
      access_token_gen: 0,
      cr_by: 'test_seed',
      cr_date: now,
      cr_prog: 'test/branches-list.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/branches-list.integration.test.js'
    },
    {
      ou_id: TEST_OU_ID,
      branch_id: HOME_BRANCH_ID,
      username: SUPPORT_USER,
      password_hash: await argon2.hash(TEST_PASS, hashOpts),
      role: 'support',
      access_token_gen: 0,
      cr_by: 'test_seed',
      cr_date: now,
      cr_prog: 'test/branches-list.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/branches-list.integration.test.js'
    },
    {
      ou_id: TEST_OU_ID,
      branch_id: HOME_BRANCH_ID,
      username: STAFF_USER,
      password_hash: await argon2.hash(TEST_PASS, hashOpts),
      role: 'staff',
      access_token_gen: 0,
      cr_by: 'test_seed',
      cr_date: now,
      cr_prog: 'test/branches-list.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/branches-list.integration.test.js'
    },
    {
      ou_id: TEST_OU_ID,
      branch_id: HOME_BRANCH_ID,
      username: BRANCH_ADMIN_USER,
      password_hash: await argon2.hash(TEST_PASS, hashOpts),
      role: 'branch_admin',
      access_token_gen: 0,
      cr_by: 'test_seed',
      cr_date: now,
      cr_prog: 'test/branches-list.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/branches-list.integration.test.js'
    }
  ])

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), { logger: false })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`

  t.after(async () => {
    await app.close()
    await client.close()
    await stop()
  })

  await t.test('returns 401 without bearer token', async () => {
    const r = await fetch(`${base}/auth/me/branches`)
    assert.equal(r.status, 401)
    assert.equal((await r.json()).code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test(
    'platform_admin lists all branches in OU including inactive and Zero HQ',
    async () => {
      const login = await loginNative(base, PLATFORM_USER)
      const r = await listBranches(base, login.access_token)
      assert.equal(r.status, 200)
      const body = await r.json()
      const ids = branchIds(body)
      assert.ok(ids.includes(HOME_BRANCH_ID.toHexString()))
      assert.ok(ids.includes(TARGET_BRANCH_ID.toHexString()))
      assert.ok(ids.includes(INACTIVE_BRANCH_ID.toHexString()))
      assert.ok(ids.includes(ZERO_HQ_ID.toHexString()))
      assert.ok(!ids.includes(FOREIGN_BRANCH_ID.toHexString()))
      assert.equal(body.branches[0].branch_id, ZERO_HQ_ID.toHexString())
    }
  )

  await t.test('support lists all branches in OU', async () => {
    const login = await loginNative(base, SUPPORT_USER)
    const r = await listBranches(base, login.access_token)
    assert.equal(r.status, 200)
    const ids = branchIds(await r.json())
    assert.ok(ids.includes(TARGET_BRANCH_ID.toHexString()))
    assert.ok(!ids.includes(FOREIGN_BRANCH_ID.toHexString()))
  })

  await t.test('staff sees only active home branch', async () => {
    const login = await loginNative(base, STAFF_USER)
    const r = await listBranches(base, login.access_token)
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.branches.length, 1)
    assert.equal(body.branches[0].branch_id, HOME_BRANCH_ID.toHexString())
  })

  await t.test('branch_admin sees only active home branch', async () => {
    const login = await loginNative(base, BRANCH_ADMIN_USER)
    const r = await listBranches(base, login.access_token)
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.branches.length, 1)
    assert.equal(body.branches[0].branch_id, HOME_BRANCH_ID.toHexString())
  })

  await t.test('returns 401 when access token_gen is stale', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    await db
      .collection(AUTH_COLLECTIONS.USERS)
      .updateOne({ username: PLATFORM_USER }, { $inc: { access_token_gen: 1 } })
    const r = await listBranches(base, login.access_token)
    assert.equal(r.status, 401)
    assert.equal((await r.json()).code, 'TOKEN_REFRESH_REJECTED')
  })
})

test(
  'GET /auth/me/branches uses platform_branches when read replica unset',
  {
    timeout: 120_000
  },
  async (t) => {
    const { databaseUri, stop } = await startMongoForTests()
    await resetDatabase(databaseUri)

    const client = new MongoClient(databaseUri)
    await client.connect()
    const db = client.db()
    await ensureAuthIndexes(db)
    await ensureZeroHqBranch(db, { ouId: TEST_OU_ID, branchId: ZERO_HQ_ID })

    const now = new Date()
    const hashOpts = { type: argon2.argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 4 }
    await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
      ou_id: TEST_OU_ID,
      branch_id: HOME_BRANCH_ID,
      username: 'branch_list_no_read',
      password_hash: await argon2.hash(TEST_PASS, hashOpts),
      role: 'platform_admin',
      access_token_gen: 0,
      cr_by: 'test_seed',
      cr_date: now,
      cr_prog: 'test/branches-list.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/branches-list.integration.test.js'
    })

    const pem = generateRsaPkcs8Pem()
    const env = testEnv(databaseUri, pem)
    delete env.MONGODB_URI_READ
    const app = await buildApp(loadEnv(env), { logger: false })
    const addr = await app.listen({ port: 0, host: '127.0.0.1' })
    const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`

    t.after(async () => {
      await app.close()
      await client.close()
      await stop()
    })

    const login = await loginNative(base, 'branch_list_no_read')
    const r = await listBranches(base, login.access_token)
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.branches.some((b) => b.branch_id === ZERO_HQ_ID.toHexString()))
    assert.ok(!body.branches.some((b) => b.branch_id === TARGET_BRANCH_ID.toHexString()))
  }
)
