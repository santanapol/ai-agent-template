import { describe, expect, test } from '@jest/globals'
import {
  accessTokenGenRedisKey,
  getCurrentTokenGenFromRedis,
  parseTokenGenFromPayload
} from '../../src/lib/redis-token-gen.js'

describe('redis-token-gen', () => {
  test('accessTokenGenRedisKey matches auth contract', () => {
    expect(accessTokenGenRedisKey('507f1f77bcf86cd799439011')).toBe(
      'user:507f1f77bcf86cd799439011:token_gen'
    )
  })

  test('parseTokenGenFromPayload accepts non-negative integers', () => {
    expect(parseTokenGenFromPayload({ token_gen: 0 })).toBe(0)
    expect(parseTokenGenFromPayload({ token_gen: 2 })).toBe(2)
    expect(parseTokenGenFromPayload({ token_gen: '3' })).toBe(3)
  })

  test('parseTokenGenFromPayload rejects missing or invalid', () => {
    expect(parseTokenGenFromPayload({})).toBeNull()
    expect(parseTokenGenFromPayload({ token_gen: -1 })).toBeNull()
    expect(parseTokenGenFromPayload({ token_gen: 1.5 })).toBeNull()
    expect(parseTokenGenFromPayload({ token_gen: 'x' })).toBeNull()
  })

  test('getCurrentTokenGenFromRedis returns 0 when key missing', async () => {
    const client = {
      async get () {
        return null
      }
    }
    await expect(getCurrentTokenGenFromRedis(client, '507f1f77bcf86cd799439011')).resolves.toBe(0)
  })

  test('getCurrentTokenGenFromRedis parses stored value', async () => {
    const client = {
      async get (key) {
        expect(key).toBe('user:507f1f77bcf86cd799439011:token_gen')
        return '2'
      }
    }
    await expect(getCurrentTokenGenFromRedis(client, '507f1f77bcf86cd799439011')).resolves.toBe(2)
  })
})
