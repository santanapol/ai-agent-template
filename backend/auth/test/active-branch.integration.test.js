/**
 * Integration tests for POST /auth/me/active-branch
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
import { hashRefreshToken } from '../src/lib/refresh-token.js'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const BRANCH_DB = 'branch_integration_test'
const PLATFORM_USER = 'active_branch_platform'
const SUPPORT_USER = 'active_branch_support'
const STAFF_USER = 'active_branch_staff'
const BRANCH_ADMIN_USER = 'active_branch_branch_admin'
const TEST_PASS = 'Correct-Horse-Battery-Staple1!'
const TEST_OU_ID = new ObjectId()
const OTHER_OU_ID = new ObjectId()
const HOME_BRANCH_ID = new ObjectId()
const TARGET_BRANCH_ID = new ObjectId()
const INACTIVE_BRANCH_ID = new ObjectId()
const FOREIGN_BRANCH_ID = new ObjectId()

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_994,
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

test('POST /auth/me/active-branch', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)
  await seedBranches(databaseUri)

  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
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
      cr_prog: 'test/active-branch.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/active-branch.integration.test.js'
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
      cr_prog: 'test/active-branch.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/active-branch.integration.test.js'
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
      cr_prog: 'test/active-branch.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/active-branch.integration.test.js'
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
      cr_prog: 'test/active-branch.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/active-branch.integration.test.js'
    }
  ])

  await db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS).insertOne({
    ou_id: null,
    role: 'platform_admin',
    menu_keys: ['profiles:*'],
    cr_by: 'test_seed',
    cr_date: now,
    cr_prog: 'test/active-branch.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/active-branch.integration.test.js'
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

  const platformLogin = await loginNative(base, PLATFORM_USER)

  await t.test('switches to target branch in same OU', async () => {
    const r = await switchBranch(base, {
      accessToken: platformLogin.access_token,
      refreshToken: platformLogin.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.access_token)
    assert.equal(body.token_type, 'Bearer')
    assert.ok(!body.refresh_token)

    const claims = decodeJwt(body.access_token)
    assert.equal(claims.branch_id, TARGET_BRANCH_ID.toHexString())
    assert.equal(claims.home_branch_id, HOME_BRANCH_ID.toHexString())
  })

  await t.test('switches to inactive branch in same OU returns 403', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const r = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: INACTIVE_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 403)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_BRANCH_FORBIDDEN')

    const denied = await db
      .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
      .findOne({ event_type: 'auth.active_branch_denied', 'detail_safe.reason': 'branch_inactive' })
    assert.ok(denied)
  })

  await t.test('support role switches to target branch in same OU', async () => {
    const login = await loginNative(base, SUPPORT_USER)
    const r = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 200)
    const claims = decodeJwt((await r.json()).access_token)
    assert.equal(claims.branch_id, TARGET_BRANCH_ID.toHexString())
    assert.equal(claims.home_branch_id, HOME_BRANCH_ID.toHexString())
  })

  await t.test(
    'no-op when switching to current active branch does not bump token_gen',
    async () => {
      const login = await loginNative(base, PLATFORM_USER)
      const beforeClaims = decodeJwt(login.access_token)
      const beforeGen = Number(beforeClaims.token_gen)

      const r = await switchBranch(base, {
        accessToken: login.access_token,
        refreshToken: login.refresh_token,
        branchId: HOME_BRANCH_ID.toHexString()
      })
      assert.equal(r.status, 200)
      const afterClaims = decodeJwt((await r.json()).access_token)
      assert.equal(afterClaims.token_gen, beforeGen)
      assert.equal(afterClaims.branch_id, HOME_BRANCH_ID.toHexString())
    }
  )

  await t.test('switch back to home branch updates session active_branch_id', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const toTarget = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(toTarget.status, 200)
    const switched = await toTarget.json()

    const toHome = await switchBranch(base, {
      accessToken: switched.access_token,
      refreshToken: login.refresh_token,
      branchId: HOME_BRANCH_ID.toHexString()
    })
    assert.equal(toHome.status, 200)
    const homeClaims = decodeJwt((await toHome.json()).access_token)
    assert.equal(homeClaims.branch_id, HOME_BRANCH_ID.toHexString())

    const hash = hashRefreshToken(login.refresh_token)
    const row = await db.collection(AUTH_COLLECTIONS.REFRESH_TOKENS).findOne({ token_hash: hash })
    assert.ok(row?.active_branch_id instanceof ObjectId)
    assert.ok(row.active_branch_id.equals(HOME_BRANCH_ID))
  })

  await t.test('parallel switch bumps token_gen; pre-switch access token is rejected', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const [first, second] = await Promise.all([
      switchBranch(base, {
        accessToken: login.access_token,
        refreshToken: login.refresh_token,
        branchId: TARGET_BRANCH_ID.toHexString()
      }),
      switchBranch(base, {
        accessToken: login.access_token,
        refreshToken: login.refresh_token,
        branchId: TARGET_BRANCH_ID.toHexString()
      })
    ])

    assert.ok(first.status === 200 || second.status === 200)

    const stale = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(stale.status, 401)
    assert.equal((await stale.json()).code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('staff role returns 403 AUTH_BRANCH_SWITCH_FORBIDDEN', async () => {
    const staffLogin = await loginNative(base, STAFF_USER)
    const r = await switchBranch(base, {
      accessToken: staffLogin.access_token,
      refreshToken: staffLogin.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 403)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_BRANCH_SWITCH_FORBIDDEN')

    const denied = await db.collection(AUTH_COLLECTIONS.AUDIT_EVENTS).findOne({
      event_type: 'auth.active_branch_denied',
      outcome: 'fail',
      'detail_safe.reason': 'role_forbidden'
    })
    assert.ok(denied)
    assert.equal(denied.detail_safe?.reason, 'role_forbidden')
  })

  await t.test('branch_admin role returns 403 AUTH_BRANCH_SWITCH_FORBIDDEN', async () => {
    const adminLogin = await loginNative(base, BRANCH_ADMIN_USER)
    const r = await switchBranch(base, {
      accessToken: adminLogin.access_token,
      refreshToken: adminLogin.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 403)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_BRANCH_SWITCH_FORBIDDEN')
  })

  await t.test('branch in another OU returns 403 AUTH_BRANCH_FORBIDDEN', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const r = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: FOREIGN_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 403)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_BRANCH_FORBIDDEN')

    const denied = await db.collection(AUTH_COLLECTIONS.AUDIT_EVENTS).findOne({
      event_type: 'auth.active_branch_denied',
      'detail_safe.reason': 'branch_forbidden'
    })
    assert.ok(denied)
  })

  await t.test('unknown branch returns 404 AUTH_BRANCH_NOT_FOUND', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const missingId = new ObjectId().toHexString()
    const r = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: missingId
    })
    assert.equal(r.status, 404)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_BRANCH_NOT_FOUND')
  })

  await t.test('without refresh returns 401 TOKEN_REFRESH_REJECTED', async () => {
    const r = await fetch(`${base}/auth/me/active-branch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platformLogin.access_token}`
      },
      body: JSON.stringify({ branch_id: TARGET_BRANCH_ID.toHexString() })
    })
    assert.equal(r.status, 401)
    const body = await r.json()
    assert.equal(body.code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('after switch, refresh keeps active branch_id (AC-4)', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const switchRes = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(switchRes.status, 200)
    const switched = await switchRes.json()

    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: login.refresh_token })
    })
    assert.equal(refreshRes.status, 200)
    const refreshed = await refreshRes.json()
    const claims = decodeJwt(refreshed.access_token)
    assert.equal(claims.branch_id, TARGET_BRANCH_ID.toHexString())
    assert.equal(claims.home_branch_id, HOME_BRANCH_ID.toHexString())

    const switchedClaims = decodeJwt(switched.access_token)
    assert.equal(switchedClaims.branch_id, TARGET_BRANCH_ID.toHexString())

    const changed = await db
      .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
      .findOne({ event_type: 'auth.active_branch_changed', outcome: 'success' })
    assert.ok(changed)
    assert.equal(changed.detail_safe?.branch_id, TARGET_BRANCH_ID.toHexString())
  })

  await t.test('switch bumps token_gen — stale access token rejected', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const beforeClaims = decodeJwt(login.access_token)
    const beforeGen = Number(beforeClaims.token_gen)

    const switchRes = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(switchRes.status, 200)
    const switched = await switchRes.json()
    const afterClaims = decodeJwt(switched.access_token)
    assert.equal(afterClaims.token_gen, beforeGen + 1)

    const stale = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(stale.status, 401)
    assert.equal((await stale.json()).code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('after switch, original refresh token still valid (no rotate)', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const switchRes = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(switchRes.status, 200)

    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: login.refresh_token })
    })
    assert.equal(refreshRes.status, 200)
  })

  await t.test('fresh login after switch resets active branch to home', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const switchRes = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(switchRes.status, 200)

    const relogin = await loginNative(base, PLATFORM_USER)
    const claims = decodeJwt(relogin.access_token)
    assert.equal(claims.branch_id, HOME_BRANCH_ID.toHexString())
    assert.equal(claims.home_branch_id, HOME_BRANCH_ID.toHexString())

    const hash = hashRefreshToken(relogin.refresh_token)
    const row = await db.collection(AUTH_COLLECTIONS.REFRESH_TOKENS).findOne({ token_hash: hash })
    assert.ok(row)
    assert.equal(row.active_branch_id, null)
  })

  await t.test('active_branch_id stored as ObjectId on refresh row', async () => {
    const login = await loginNative(base, PLATFORM_USER)
    const switchRes = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(switchRes.status, 200)

    const hash = hashRefreshToken(login.refresh_token)
    const row = await db.collection(AUTH_COLLECTIONS.REFRESH_TOKENS).findOne({ token_hash: hash })
    assert.ok(row?.active_branch_id instanceof ObjectId)
    assert.ok(row.active_branch_id.equals(TARGET_BRANCH_ID))
  })
})

test(
  'POST /auth/me/active-branch returns 503 when branch read is not configured',
  {
    timeout: 180_000
  },
  async (t) => {
    const { databaseUri, stop } = await startMongoForTests()
    await resetDatabase(databaseUri)

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
      cr_prog: 'test/active-branch.integration.test.js',
      upd_by: 'test_seed',
      upd_date: now,
      upd_prog: 'test/active-branch.integration.test.js'
    })

    const pem = generateRsaPkcs8Pem()
    const env = testEnv(databaseUri, pem)
    env.MONGODB_URI_READ = ''
    const app = await buildApp(loadEnv(env), { logger: false })
    const addr = await app.listen({ port: 0, host: '127.0.0.1' })
    const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`

    t.after(async () => {
      await app.close()
      await client.close()
      await stop()
    })

    const login = await loginNative(base, PLATFORM_USER)
    const r = await switchBranch(base, {
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      branchId: TARGET_BRANCH_ID.toHexString()
    })
    assert.equal(r.status, 503)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_NOT_READY')
  }
)
