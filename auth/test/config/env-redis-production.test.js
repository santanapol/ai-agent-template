import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadEnv } from '../../src/config/env.js'
import { generateRsaPkcs8Pem } from '../helpers/rsa-pem.mjs'

const baseEnv = () => ({
  TZ: 'UTC',
  PORT: 3001,
  DATABASE_URI: 'mongodb://127.0.0.1:27017/auth',
  JWT_PRIVATE_KEY_PEM: generateRsaPkcs8Pem(),
  JWKS_PUBLIC_URL: 'https://auth.example.invalid/.well-known/jwks.json',
  AUTH_INTERNAL_SERVICE_SECRET: 'secret-min-16-chars'
})

test('loadEnv requires REDIS_URL when NODE_ENV=production', () => {
  assert.throws(
    () =>
      loadEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        REDIS_URL: ''
      }),
    /REDIS_URL/
  )
})

test('loadEnv allows empty REDIS_URL in non-production', () => {
  const env = loadEnv({
    ...baseEnv(),
    NODE_ENV: 'test',
    REDIS_URL: ''
  })
  assert.equal(env.REDIS_URL, '')
})
