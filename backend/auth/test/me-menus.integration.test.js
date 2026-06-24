/**
 * Integration tests for GET /auth/me/menus (โครงเมนูเฉพาะที่ผู้ใช้มีสิทธิ์)
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

const TEST_USER = 'me_menus_user'
const GHOST_USER = 'me_menus_ghost'
const TEST_PASS = 'Correct-Horse-Battery-Staple1!'
const TEST_OU_ID = new ObjectId()
const TEST_BRANCH_ID = new ObjectId()
const OTHER_OU_ID = new ObjectId()

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    TZ: 'UTC',
    PORT: 39_994,
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
    cr_prog: 'test/me-menus.integration.test.js',
    upd_by: 'test_seed',
    upd_date: now,
    upd_prog: 'test/me-menus.integration.test.js'
  }
}

function menuDoc(now, key, label, type, parent_key, sort_order, ou_id = null) {
  return { key, label, type, parent_key, sort_order, ou_id, ...auditStamp(now) }
}

async function userDoc(now, username, role) {
  return {
    ou_id: TEST_OU_ID,
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

test('GET /auth/me/menus', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  t.after(() => stop())
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  t.after(() => client.close())
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()

  await db
    .collection(AUTH_COLLECTIONS.USERS)
    .insertMany([await userDoc(now, TEST_USER, 'admin'), await userDoc(now, GHOST_USER, 'ghost')])

  // โครง 3 ระดับสองกิ่ง: ผู้ใช้มีสิทธิ์เฉพาะกิ่ง staff (profiles:*) — กิ่ง billing ต้องไม่โผล่
  await db.collection(AUTH_COLLECTIONS.MENUS).insertMany([
    menuDoc(now, 'staff', 'จัดการพนักงาน', 'menu', null, 20),
    menuDoc(now, 'staff:profiles', 'โปรไฟล์พนักงาน', 'menu', 'staff', 10),
    menuDoc(now, 'profiles:list', 'รายชื่อพนักงาน', 'action', 'staff:profiles', 10),
    menuDoc(now, 'profiles:create', 'สร้างโปรไฟล์พนักงาน', 'action', 'staff:profiles', 20),
    menuDoc(now, 'billing', 'การเงิน', 'menu', null, 10),
    menuDoc(now, 'invoice:read', 'ดูใบแจ้งหนี้', 'action', 'billing', 10),
    // action เฉพาะ OU อื่น — ต้องไม่โผล่แม้ key จะ match wildcard
    menuDoc(now, 'profiles:secret', 'ลับเฉพาะ OU อื่น', 'action', 'staff:profiles', 30, OTHER_OU_ID)
  ])
  await db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS).insertOne({
    ou_id: null,
    role: 'admin',
    menu_keys: ['profiles:*'],
    ...auditStamp(now)
  })

  const pem = generateRsaPkcs8Pem()
  const app = await buildApp(loadEnv(testEnv(databaseUri, pem)), { logger: false })
  const addr = await app.listen({ port: 0, host: '127.0.0.1' })
  const base = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr.port}`
  t.after(() => app.close())

  const accessToken = await login(base, TEST_USER)

  await t.test(
    'returns granted actions with ancestors, ordered by depth then sort_order',
    async () => {
      const r = await fetch(`${base}/auth/me/menus`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      assert.equal(r.status, 200)
      const body = await r.json()
      assert.deepEqual(body, {
        menus: [
          { key: 'staff', label: 'จัดการพนักงาน', type: 'menu', parent_key: null, sort_order: 20 },
          {
            key: 'staff:profiles',
            label: 'โปรไฟล์พนักงาน',
            type: 'menu',
            parent_key: 'staff',
            sort_order: 10
          },
          {
            key: 'profiles:list',
            label: 'รายชื่อพนักงาน',
            type: 'action',
            parent_key: 'staff:profiles',
            sort_order: 10
          },
          {
            key: 'profiles:create',
            label: 'สร้างโปรไฟล์พนักงาน',
            type: 'action',
            parent_key: 'staff:profiles',
            sort_order: 20
          }
        ]
      })
    }
  )

  await t.test('user without permission mapping gets an empty list', async () => {
    const ghostToken = await login(base, GHOST_USER)
    const r = await fetch(`${base}/auth/me/menus`, {
      headers: { Authorization: `Bearer ${ghostToken}` }
    })
    assert.equal(r.status, 200)
    assert.deepEqual(await r.json(), { menus: [] })
  })

  await t.test('without Bearer returns 401 problem+json', async () => {
    const r = await fetch(`${base}/auth/me/menus`)
    assert.equal(r.status, 401)
    assert.equal(r.headers.get('content-type')?.split(';')[0], 'application/problem+json')
    const body = await r.json()
    assert.equal(body.code, 'TOKEN_REFRESH_REJECTED')
  })

  await t.test('garbage token returns 401', async () => {
    const r = await fetch(`${base}/auth/me/menus`, {
      headers: { Authorization: 'Bearer not-a-jwt' }
    })
    assert.equal(r.status, 401)
  })

  await t.test('stale token_gen returns 401', async () => {
    await db
      .collection(AUTH_COLLECTIONS.USERS)
      .updateOne({ username: TEST_USER }, { $inc: { access_token_gen: 1 } })
    const r = await fetch(`${base}/auth/me/menus`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    assert.equal(r.status, 401)
  })
})
