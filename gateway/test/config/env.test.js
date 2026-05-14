import { describe, expect, test } from '@jest/globals'
import { loadEnv } from '../../src/config/env.js'

describe('loadEnv', () => {
  test('rejects JWT_SECRET when set', () => {
    expect(() =>
      loadEnv({
        PORT: 3002,
        JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
        GATEWAY_SECRET: 'x'.repeat(32),
        UPSTREAM_TIMEOUT_MS: 5000,
        ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]',
        JWT_SECRET: 'nope'
      })
    ).toThrow(/JWT_SECRET/)
  })

  test('requires exactly one of ROUTES_JSON / ROUTES_FILE', () => {
    expect(() =>
      loadEnv({
        PORT: 3002,
        JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
        GATEWAY_SECRET: 'x'.repeat(32),
        UPSTREAM_TIMEOUT_MS: 5000
      })
    ).toThrow(/Exactly one of ROUTES_JSON or ROUTES_FILE/)
  })

  test('rejects GATEWAY_SECRET shorter than 32 characters', () => {
    expect(() =>
      loadEnv({
        PORT: 3002,
        JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
        GATEWAY_SECRET: 'x'.repeat(31),
        UPSTREAM_TIMEOUT_MS: 5000,
        ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]'
      })
    ).toThrow(/GATEWAY_SECRET/)
  })
})
