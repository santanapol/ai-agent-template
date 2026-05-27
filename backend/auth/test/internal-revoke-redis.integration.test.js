/**
 * Redis publish + fail-closed paths for O-16 internal revoke (review F-P1-01, F-P2-02).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { accessTokenGenRedisKey } from '../src/lib/redis-access-token-gen.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const INTERNAL_SECRET = 'test-internal-service-secret-32chars'

function testEnv(databaseUri, jwtPrivateKeyPem) {
  return {
    NODE_ENV: 'test',
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
    REDIS_URL: 'redis://127.0.0.1:6379/0'
  }
}

function createMockRedis() {
  /** @type {Map<string, string>} */
  const store = new Map()
  let failSet = false
  return {
    store,
    setFailOnSet(value) {
      failSet = value
    },
    async get(key) {
      return store.has(key) ? store.get(key) : null
    },
    async set(key, value) {
      if (failSet) throw new Error('redis SET failed (test)')
      store.set(key, value)
    },
    async ping() {
      return 'PONG'
    }
  }
}

test('internal revoke redis integration', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const now = new Date()
  const insert = await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
    ou_id: new ObjectId(),
    branch_id: new ObjectId(),
    username: 'redis_revoke_user',
    password_hash: await argon2.hash('password-ok-12345', {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4
    }),
    role: 'admin',
    access_token_gen: 0,
    cr_by: 'test',
    cr_date: now,
    cr_prog: 'test/internal-revoke-redis.integration.test.js',
    upd_by: 'test',
    upd_date: now,
    upd_prog: 'test/internal-revoke-redis.integration.test.js'
  })
  const userHex = insert.insertedId.toHexString()

  const pem = generateRsaPkcs8Pem()
  const mockRedis = createMockRedis()
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

  await t.test('GET /readyz includes redis when client configured', async () => {
    const r = await fetch(`${base}/readyz`, { headers: { Accept: 'application/json' } })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.status, 'ok')
    const names = body.dependencies.map((d) => d.name)
    assert.ok(names.includes('mongodb'))
    assert.ok(names.includes('redis'))
  })

  await t.test('POST internal revoke publishes token_gen to redis', async () => {
    const r = await fetch(`${base}/internal/users/${userHex}/sessions/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ reason: 'test.redis.publish' })
    })
    assert.equal(r.status, 200)
    const body = await r.json()
    assert.equal(body.access_token_gen, 1)
    assert.equal(mockRedis.store.get(accessTokenGenRedisKey(userHex)), '1')
  })

  await t.test('POST internal revoke returns 503 when redis SET fails', async () => {
    mockRedis.setFailOnSet(true)
    const r = await fetch(`${base}/internal/users/${userHex}/sessions/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ correlation_id: 'corr-redis-fail' })
    })
    mockRedis.setFailOnSet(false)
    assert.equal(r.status, 503)
    const body = await r.json()
    assert.equal(body.code, 'AUTH_NOT_READY')
    const user = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: insert.insertedId })
    assert.equal(user.access_token_gen, 2)
  })
})
