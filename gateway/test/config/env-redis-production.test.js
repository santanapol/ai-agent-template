import { describe, expect, test } from '@jest/globals'
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
    expect(() =>
      loadEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        REDIS_URL: ''
      })
    ).toThrow(/REDIS_URL/)
  })

  test('allows empty REDIS_URL in non-production', () => {
    const env = loadEnv({
      ...baseEnv(),
      NODE_ENV: 'test',
      REDIS_URL: ''
    })
    expect(env.REDIS_URL).toBe('')
  })
})
