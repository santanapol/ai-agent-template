import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  accessTokenGenRedisKey,
  setAccessTokenGenInRedis
} from '../src/lib/redis-access-token-gen.js'

test('accessTokenGenRedisKey matches gateway contract', () => {
  assert.equal(
    accessTokenGenRedisKey('507f1f77bcf86cd799439011'),
    'user:507f1f77bcf86cd799439011:token_gen'
  )
})

test('setAccessTokenGenInRedis no-ops when client is null', async () => {
  await setAccessTokenGenInRedis(null, '507f1f77bcf86cd799439011', 7)
})

test('setAccessTokenGenInRedis calls SET with string value', async () => {
  /** @type {Array<[string, string]>} */
  const sets = []
  const mock = {
    async set(k, v, _opts) {
      sets.push([k, v])
    }
  }
  await setAccessTokenGenInRedis(mock, '507f1f77bcf86cd799439011', 3)
  assert.deepEqual(sets, [['user:507f1f77bcf86cd799439011:token_gen', '3']])
})

test('setAccessTokenGenInRedis passes EX option when ttlSeconds > 0', async () => {
  const calls = []
  const mock = {
    async set(k, v, opts) {
      calls.push({ k, v, opts })
    }
  }
  await setAccessTokenGenInRedis(mock, '507f1f77bcf86cd799439011', 5, 87300)
  assert.deepEqual(calls[0].opts, { EX: 87300 })
})

test('setAccessTokenGenInRedis omits EX when ttlSeconds is 0', async () => {
  const calls = []
  const mock = {
    async set(k, v, opts) {
      calls.push({ k, v, opts })
    }
  }
  await setAccessTokenGenInRedis(mock, '507f1f77bcf86cd799439011', 5, 0)
  assert.deepEqual(calls[0].opts, {})
})
