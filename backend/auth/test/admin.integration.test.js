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

const TEST_ADMIN = 'admin_user'
const TEST_STAFF = 'staff_user'
const TEST_PASS = 'Correct-Horse-Battery-Staple1!'
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

function auditStamp(now) {
  return {
    cr_by: 'test_seed',
    cr_date: now,
    cr_prog: 'test/admin.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/admin.integration.test.js'
  }
}

async function userDoc(now, username, role, ouId = TEST_OU_ID) {
  return {
    ou_id: ouId,
    branch_id: TEST_BRANCH_ID,
    username,
    password_hash: await argon2.hash(TEST_PASS, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    }),
    role,
    access_token_gen: 0,
    ...auditStamp(now)
  }
}

async function login(base, username) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: TEST_PASS, client_kind: 'native' })
  })
  assert.equal(r.status, 200)
  return (await r.json()).access_token
}

test('Admin APIs Integration Tests', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  t.after(() => stop())
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  t.after(() => client.close())
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()

  // Seed users
  await db
    .collection(AUTH_COLLECTIONS.USERS)
    .insertMany([
      await userDoc(now, TEST_ADMIN, 'platform_admin', null),
      await userDoc(now, TEST_STAFF, 'branch_staff', null)
    ])

  // Seed menus (key, label, type, parent_key, sort_order)
  await db.collection(AUTH_COLLECTIONS.MENUS).insertMany([
    {
      key: 'staff',
      label: 'จัดการพนักงาน',
      type: 'menu',
      parent_key: null,
      sort_order: 10,
      ou_id: null,
      ...auditStamp(now)
    },
    {
      key: 'staff:profiles',
      label: 'โปรไฟล์พนักงาน',
      type: 'menu',
      parent_key: 'staff',
      sort_order: 10,
      ou_id: null,
      ...auditStamp(now)
    },
    {
      key: 'profiles:list',
      label: 'รายชื่อพนักงาน',
      type: 'action',
      parent_key: 'staff:profiles',
      sort_order: 10,
      ou_id: null,
      ...auditStamp(now)
    },
    {
      key: 'permissions:manage',
      label: 'จัดการสิทธิ์',
      type: 'action',
      parent_key: 'staff:profiles',
      sort_order: 20,
      ou_id: null,
      ...auditStamp(now)
    }
  ])

  // Seed roles mappings
  await db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS).insertMany([
    {
      ou_id: null,
      role: 'platform_admin',
      menu_keys: ['permissions:manage', 'profiles:*'],
      ...auditStamp(now)
    },
    { ou_id: null, role: 'branch_staff', menu_keys: ['profiles:list'], ...auditStamp(now) }
  ])

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), { logger: false })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`
  t.after(() => app.close())

  const adminToken = await login(base, TEST_ADMIN)
  const staffToken = await login(base, TEST_STAFF)

  await t.test('GET /auth/admin/menus returns all menus', async () => {
    const r = await fetch(`${base}/auth/admin/menus`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.menus.length >= 4)
    assert.ok(body.menus.some((m) => m.key === 'permissions:manage'))
  })

  await t.test('GET /auth/admin/menus rejects staff without permissions:manage', async () => {
    const r = await fetch(`${base}/auth/admin/menus`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    })
    assert.equal(r.status, 403)
  })

  await t.test('POST /auth/admin/menus creates menu successfully', async () => {
    const r = await fetch(`${base}/auth/admin/menus`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'profiles:create',
        label: 'สร้างโปรไฟล์',
        type: 'action',
        parent_key: 'staff:profiles',
        sort_order: 30
      })
    })
    assert.equal(r.status, 201)
    const body = await r.json()
    assert.equal(body.key, 'profiles:create')
  })

  await t.test('POST /auth/admin/menus validation errors returned', async () => {
    const r = await fetch(`${base}/auth/admin/menus`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'profiles:delete',
        label: 'ลบโปรไฟล์',
        type: 'action',
        parent_key: 'ghost-parent', // ผีไม่มีจริง
        sort_order: 30
      })
    })
    assert.equal(r.status, 400)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_INVALID_REQUEST')
  })

  await t.test('PATCH /auth/admin/menus updates menu successfully', async () => {
    const orig = await db.collection(AUTH_COLLECTIONS.MENUS).findOne({ key: 'profiles:list' })
    assert.ok(orig)

    const r = await fetch(`${base}/auth/admin/menus/profiles:list`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'If-Match': orig.upd_date.toISOString()
      },
      body: JSON.stringify({
        label: 'รายชื่อพนักงาน (อัปเดต)',
        sort_order: 15
      })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.label, 'รายชื่อพนักงาน (อัปเดต)')
  })

  await t.test('PATCH /auth/admin/menus 412 on ETag mismatch', async () => {
    const r = await fetch(`${base}/auth/admin/menus/profiles:list`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'If-Match': new Date('2000-01-01').toISOString()
      },
      body: JSON.stringify({
        label: 'ทดสอบ'
      })
    })
    assert.equal(r.status, 412)
  })

  await t.test('PATCH /auth/admin/menus 400 when modifying permissions:manage key', async () => {
    const orig = await db.collection(AUTH_COLLECTIONS.MENUS).findOne({ key: 'permissions:manage' })
    const r = await fetch(`${base}/auth/admin/menus/permissions:manage`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'If-Match': orig.upd_date.toISOString()
      },
      body: JSON.stringify({
        label: 'จัดการสิทธิ์เท่านั้น'
      })
    })
    assert.equal(r.status, 400)
  })

  await t.test('DELETE /auth/admin/menus 409 on child nodes exist', async () => {
    const orig = await db.collection(AUTH_COLLECTIONS.MENUS).findOne({ key: 'staff' })
    const r = await fetch(`${base}/auth/admin/menus/staff`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'If-Match': orig.upd_date.toISOString()
      }
    })
    assert.equal(r.status, 409)
  })

  await t.test('GET /auth/admin/role-permissions retrieves registry', async () => {
    const r = await fetch(`${base}/auth/admin/role-permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.ok(body.role_permissions.length >= 2)
  })

  await t.test('PUT /auth/admin/role-permissions upserts mapping successfully', async () => {
    const r = await fetch(`${base}/auth/admin/role-permissions/null/branch_staff`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        menu_keys: ['profiles:list', 'profiles:create'],
        revoke_sessions: true
      })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.role, 'branch_staff')
    assert.deepEqual(body.menu_keys, ['profiles:list', 'profiles:create'])

    // Verify token_gen was incremented
    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ username: TEST_STAFF })
    assert.equal(user.access_token_gen, 1)
  })

  await t.test(
    'PUT /auth/admin/role-permissions 400 on self-lockout (remove permissions:manage from platform_admin)',
    async () => {
      const r = await fetch(`${base}/auth/admin/role-permissions/null/platform_admin`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menu_keys: ['profiles:list'] // missing permissions:manage or permissions:*
        })
      })
      assert.equal(r.status, 400)
    }
  )

  await t.test(
    'DELETE /auth/admin/role-permissions 409 AUTH_ROLE_PERMISSION_IN_USE when active users exist',
    async () => {
      // branch_staff user exists in the seed — deleting branch_staff mapping without confirm should block
      const r = await fetch(`${base}/auth/admin/role-permissions/null/branch_staff`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.equal(r.status, 409)
      const body = await r.json()
      assert.equal(body.code, 'AUTH_ROLE_PERMISSION_IN_USE')
    }
  )

  await t.test(
    'DELETE /auth/admin/role-permissions 204 when confirm=true is passed despite active users',
    async () => {
      const r = await fetch(`${base}/auth/admin/role-permissions/null/branch_staff?confirm=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.equal(r.status, 204)
    }
  )

  await t.test(
    'PUT /auth/admin/role-permissions with revoke_sessions:true affecting own role → subsequent request with old token gets 401',
    async () => {
      // Re-create branch_staff mapping (was deleted above) then get a fresh admin token
      await fetch(`${base}/auth/admin/role-permissions/null/branch_staff`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ menu_keys: ['profiles:list', 'permissions:manage'] })
      })

      // Capture a fresh admin token and store it as "stale" — we will revoke it
      const staleAdminToken = await login(base, TEST_ADMIN)

      // Now PUT platform_admin's own mapping with revoke_sessions:true — this increments access_token_gen
      const rPut = await fetch(`${base}/auth/admin/role-permissions/null/platform_admin`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staleAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menu_keys: ['permissions:manage', 'profiles:*'],
          revoke_sessions: true
        })
      })
      assert.equal(rPut.status, 200)

      // Retry any admin endpoint with the stale token — must get 401 (token_gen mismatch)
      const rRetry = await fetch(`${base}/auth/admin/menus`, {
        headers: { Authorization: `Bearer ${staleAdminToken}` }
      })
      assert.equal(rRetry.status, 401)
    }
  )
})
