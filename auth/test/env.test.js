import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadEnv } from '../src/config/env.js'

test('loadEnv rejects TZ values other than UTC', () => {
  assert.throws(
    () =>
      loadEnv({
        TZ: 'Asia/Bangkok',
        DATABASE_URI: 'mongodb://localhost:27017/auth',
        JWT_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        JWKS_PUBLIC_URL: 'https://auth.test.invalid/.well-known/jwks.json',
        AUTH_INTERNAL_SERVICE_SECRET: 'test-internal-service-secret-32chars',
        REDIS_URL: ''
      }),
    /Invalid environment/u
  )
})
