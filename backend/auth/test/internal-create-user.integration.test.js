import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { MongoClient, ObjectId } from 'mongodb'

import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'

describe('internal create user', () => {
  let app
  let mongoClient
  let db
  let internalSecret = 'supersecret_internal_key_for_testing'
  let stopMongo

  before(async () => {
    const { databaseUri, stop } = await startMongoForTests()
    stopMongo = stop
    await resetDatabase(databaseUri)

    mongoClient = new MongoClient(databaseUri)
    await mongoClient.connect()
    db = mongoClient.db()

    await ensureAuthIndexes(db)

    const privateKeyPem = generateRsaPkcs8Pem()

    const env = loadEnv({
      NODE_ENV: 'test',
      TZ: 'UTC',
      PORT: '0',
      DATABASE_URI: databaseUri,
      JWT_PRIVATE_KEY_PEM: privateKeyPem,
      JWT_KID: 'test-kid',
      JWT_ISSUER: 'urn:test:issuer',
      JWT_AUDIENCE: 'urn:test:audience',
      JWT_CLAIM_ROLE: 'role',
      JWKS_PUBLIC_URL: 'https://auth.test.invalid/.well-known/jwks.json',
      AUTH_INTERNAL_SERVICE_SECRET: internalSecret,
      CORS_ORIGINS: '',
      COOKIE_SECURE: 'false',
      TRUST_PROXY: 'false',
      PROBLEM_TYPE_BASE: 'https://example.invalid/auth/problems',
      ACCESS_TOKEN_TTL_SECONDS: '900',
      REFRESH_TOKEN_TTL_SECONDS: '86400',
      REDIS_URL: ''
    })

    app = await buildApp(env, { logger: false })
    await app.ready()
  })

  after(async () => {
    await app.close()
    await mongoClient.close()
    await stopMongo()
  })

  test('POST internal create user without Bearer returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/users',
      body: {
        ou_id: new ObjectId().toHexString(),
        branch_id: new ObjectId().toHexString(),
        username: 'no-bearer',
        password: 'Password123456789'
      }
    })
    assert.equal(res.statusCode, 401)
  })

  test('POST internal create user returns 201 and creates user', async () => {
    const payload = {
      ou_id: new ObjectId().toHexString(),
      branch_id: new ObjectId().toHexString(),
      username: 'new_staff_member',
      password: 'StrongPassword123!',
      role: 'staff'
    }

    const res = await app.inject({
      method: 'POST',
      url: '/internal/users',
      headers: { authorization: `Bearer ${internalSecret}` },
      body: payload
    })

    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.payload)
    assert.equal(body.username, payload.username)
    assert.equal(body.role, 'staff')
    assert.ok(body.user_id)

    // Verify in DB
    const userDoc = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: new ObjectId(body.user_id) })
    assert.ok(userDoc)
    assert.equal(userDoc.username, payload.username)
    assert.equal(userDoc.ou_id.toHexString(), payload.ou_id)
    assert.equal(userDoc.branch_id.toHexString(), payload.branch_id)
  })

  test('POST internal create user returns 409 if username exists', async () => {
    const payload = {
      ou_id: new ObjectId().toHexString(),
      branch_id: new ObjectId().toHexString(),
      username: 'conflict_staff',
      password: 'StrongPassword123!',
      role: 'staff'
    }

    // First create
    await app.inject({
      method: 'POST',
      url: '/internal/users',
      headers: { authorization: `Bearer ${internalSecret}` },
      body: payload
    })

    // Second create with same username
    const res = await app.inject({
      method: 'POST',
      url: '/internal/users',
      headers: { authorization: `Bearer ${internalSecret}` },
      body: payload
    })

    assert.equal(res.statusCode, 409)
    const body = JSON.parse(res.payload)
    assert.equal(body.code, 'AUTH_USER_ALREADY_EXISTS')
  })
})
