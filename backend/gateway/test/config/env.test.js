import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { loadEnv } from '../../src/config/env.js'

describe('loadEnv', () => {
  test('rejects JWT_SECRET when set', () => {
    assert.throws(
      () =>
        loadEnv({
          PORT: 3002,
          JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
          GATEWAY_SECRET: 'x'.repeat(32),
          UPSTREAM_TIMEOUT_MS: 5000,
          ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]',
          JWT_SECRET: 'nope'
        }),
      /JWT_SECRET/
    )
  })

  test('requires exactly one of ROUTES_JSON / ROUTES_FILE', () => {
    assert.throws(
      () =>
        loadEnv({
          PORT: 3002,
          JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
          GATEWAY_SECRET: 'x'.repeat(32),
          UPSTREAM_TIMEOUT_MS: 5000
        }),
      /Exactly one of ROUTES_JSON or ROUTES_FILE/
    )
  })

  test('rejects TZ values other than UTC', () => {
    assert.throws(
      () =>
        loadEnv({
          TZ: 'Asia/Bangkok',
          PORT: 3002,
          JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
          GATEWAY_SECRET: 'x'.repeat(32),
          UPSTREAM_TIMEOUT_MS: 5000,
          ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]'
        }),
      /TZ/
    )
  })

  test('defaults TZ to UTC', () => {
    const env = loadEnv({
      PORT: 3002,
      JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
      GATEWAY_SECRET: 'x'.repeat(32),
      UPSTREAM_TIMEOUT_MS: 5000,
      ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]'
    })
    assert.strictEqual(env.TZ, 'UTC')
  })

  test('rejects GATEWAY_SECRET shorter than 32 characters', () => {
    assert.throws(
      () =>
        loadEnv({
          PORT: 3002,
          JWT_JWKS_URL: 'http://127.0.0.1:3001/.well-known/jwks.json',
          GATEWAY_SECRET: 'x'.repeat(31),
          UPSTREAM_TIMEOUT_MS: 5000,
          ROUTES_JSON: '[{"prefix":"/api","upstream":"http://127.0.0.1:1","stripPrefix":true}]'
        }),
      /GATEWAY_SECRET/
    )
  })
})
