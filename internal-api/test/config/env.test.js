import { describe, expect, test } from '@jest/globals'
import { loadEnv } from '../../src/config/env.js'

describe('loadEnv', () => {
  test('rejects GATEWAY_SECRET shorter than 32 characters', () => {
    expect(() =>
      loadEnv({
        PORT: 4010,
        GATEWAY_SECRET: 'x'.repeat(31),
        TRUST_PROXY: false
      })
    ).toThrow(/GATEWAY_SECRET/)
  })

  test('accepts GATEWAY_SECRET of length 32', () => {
    const v = loadEnv({
      PORT: 4010,
      GATEWAY_SECRET: 'x'.repeat(32),
      TRUST_PROXY: false
    })
    expect(v.GATEWAY_SECRET).toHaveLength(32)
  })
})
