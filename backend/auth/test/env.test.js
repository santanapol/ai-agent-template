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

test('loadEnv accepts TZ=UTC with CRLF suffix (Windows .env line endings)', () => {
  const env = loadEnv({
    TZ: 'UTC\r',
    DATABASE_URI: 'mongodb://localhost:27017/auth',
    JWT_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
    JWKS_PUBLIC_URL: 'https://auth.test.invalid/.well-known/jwks.json',
    AUTH_INTERNAL_SERVICE_SECRET: 'test-internal-service-secret-32chars',
    REDIS_URL: ''
  })
  assert.equal(env.TZ, 'UTC')
})

test('loadEnv defaults ACCESS_JWT_SOFT_LIMIT_BYTES to 4096', () => {
  const env = loadEnv({
    TZ: 'UTC',
    DATABASE_URI: 'mongodb://localhost:27017/auth',
    JWT_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
    JWKS_PUBLIC_URL: 'https://auth.test.invalid/.well-known/jwks.json',
    AUTH_INTERNAL_SERVICE_SECRET: 'test-internal-service-secret-32chars',
    REDIS_URL: ''
  })
  assert.equal(env.ACCESS_JWT_SOFT_LIMIT_BYTES, 4096)
})

test('loadEnv parses ACCESS_JWT_SOFT_LIMIT_BYTES override', () => {
  const env = loadEnv({
    TZ: 'UTC',
    DATABASE_URI: 'mongodb://localhost:27017/auth',
    JWT_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
    JWKS_PUBLIC_URL: 'https://auth.test.invalid/.well-known/jwks.json',
    AUTH_INTERNAL_SERVICE_SECRET: 'test-internal-service-secret-32chars',
    REDIS_URL: '',
    ACCESS_JWT_SOFT_LIMIT_BYTES: '8192'
  })
  assert.equal(env.ACCESS_JWT_SOFT_LIMIT_BYTES, 8192)
})
