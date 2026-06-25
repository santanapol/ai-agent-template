import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import {
  accessTokenGenRedisKey,
  getCurrentTokenGenFromRedis,
  parseTokenGenFromPayload
} from '../../src/lib/redis-token-gen.js'

describe('redis-token-gen', () => {
  test('accessTokenGenRedisKey matches auth contract', () => {
    assert.strictEqual(
      accessTokenGenRedisKey('507f1f77bcf86cd799439011'),
      'user:507f1f77bcf86cd799439011:token_gen'
    )
  })

  test('parseTokenGenFromPayload accepts non-negative integers', () => {
    assert.strictEqual(parseTokenGenFromPayload({ token_gen: 0 }), 0)
    assert.strictEqual(parseTokenGenFromPayload({ token_gen: 2 }), 2)
    assert.strictEqual(parseTokenGenFromPayload({ token_gen: '3' }), 3)
  })

  test('parseTokenGenFromPayload rejects missing or invalid', () => {
    assert.strictEqual(parseTokenGenFromPayload({}), null)
    assert.strictEqual(parseTokenGenFromPayload({ token_gen: -1 }), null)
    assert.strictEqual(parseTokenGenFromPayload({ token_gen: 1.5 }), null)
    assert.strictEqual(parseTokenGenFromPayload({ token_gen: 'x' }), null)
  })

  test('getCurrentTokenGenFromRedis returns null when key missing and rejectIfMissing', async () => {
    const client = {
      async get() {
        return null
      }
    }
    assert.strictEqual(
      await getCurrentTokenGenFromRedis(client, '507f1f77bcf86cd799439011', {
        rejectIfMissing: true
      }),
      null
    )
  })

  test('getCurrentTokenGenFromRedis returns 0 when key missing by default', async () => {
    const client = {
      async get() {
        return null
      }
    }
    assert.strictEqual(await getCurrentTokenGenFromRedis(client, '507f1f77bcf86cd799439011'), 0)
  })

  test('getCurrentTokenGenFromRedis parses stored value', async () => {
    const client = {
      async get(key) {
        assert.strictEqual(key, 'user:507f1f77bcf86cd799439011:token_gen')
        return '2'
      }
    }
    assert.strictEqual(await getCurrentTokenGenFromRedis(client, '507f1f77bcf86cd799439011'), 2)
  })
})
