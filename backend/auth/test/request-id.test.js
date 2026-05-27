import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveRequestId } from '../src/lib/request-id.js'

const VALID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

test('resolveRequestId accepts lowercase UUID v4 from header', () => {
  assert.equal(resolveRequestId(VALID), VALID)
  assert.equal(resolveRequestId(VALID.toUpperCase()), VALID)
})

test('resolveRequestId rejects invalid header and mints UUID v4', () => {
  const id = resolveRequestId('not-a-uuid')
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('resolveRequestId mints when header missing', () => {
  const id = resolveRequestId(undefined)
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})
