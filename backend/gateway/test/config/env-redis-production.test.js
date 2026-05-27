import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { loadEnv } from '../../src/config/env.js'

const baseEnv = () => ({
  PORT: 3002,
  JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
  GATEWAY_SECRET: 'x'.repeat(32),
  UPSTREAM_TIMEOUT_MS: 5000,
  ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]',
  ROUTES_FILE: ''
})

describe('loadEnv REDIS_URL production policy', () => {
  test('requires REDIS_URL when NODE_ENV=production', () => {
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

  test('allows empty REDIS_URL in non-production', () => {
    const env = loadEnv({
      ...baseEnv(),
      NODE_ENV: 'test',
      REDIS_URL: ''
    })
    assert.strictEqual(env.REDIS_URL, '')
  })
})
